import asyncio
import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.strategy import Strategy
from app.models.trade import Trade
from app.services.exchange import get_exchange
from app.services.pnl_calculator import calculate_trade_pnl
from app.services.websocket_manager import ws_manager
from app.strategies.ma_crossover import MACrossoverStrategy
from app.strategies.rsi_strategy import RSIStrategy

logger = logging.getLogger(__name__)

TIMEFRAME_SECONDS = {
    "1m": 60, "3m": 180, "5m": 300, "15m": 900,
    "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400,
}

_strategy_tasks: dict[int, asyncio.Task] = {}


def build_strategy(strategy_type: str, params: dict):
    if strategy_type == "ma_crossover":
        return MACrossoverStrategy(params)
    if strategy_type == "rsi":
        return RSIStrategy(params)
    raise ValueError(f"Unknown strategy type: {strategy_type}")


async def _run_strategy(strategy_id: int):
    logger.info(f"Strategy {strategy_id} started")
    while True:
        db = SessionLocal()
        try:
            strat = db.query(Strategy).filter(Strategy.id == strategy_id).first()
            if not strat or not strat.is_active:
                break

            params = json.loads(strat.parameters)
            strategy = build_strategy(strat.strategy_type, params)
            exchange = get_exchange()

            try:
                ohlcv = await exchange.fetch_ohlcv(strat.symbol, strat.timeframe, limit=100)
                await exchange.close()
            except Exception as e:
                logger.warning(f"OHLCV fetch failed for strategy {strategy_id}: {e}")
                await asyncio.sleep(60)
                continue

            raw = [
                {"time": c[0] // 1000, "open": c[1], "high": c[2],
                 "low": c[3], "close": c[4], "volume": c[5]}
                for c in ohlcv
            ]
            df = strategy.prepare_ohlcv(raw)
            signal = strategy.generate_signal(df)

            logger.debug(f"Strategy {strategy_id} signal: {signal}")

            if signal in ("buy", "sell"):
                await _execute_signal(signal, strat, db)

            interval = TIMEFRAME_SECONDS.get(strat.timeframe, 3600)
            await asyncio.sleep(interval)

        except asyncio.CancelledError:
            logger.info(f"Strategy {strategy_id} cancelled")
            break
        except Exception as e:
            logger.error(f"Strategy {strategy_id} error: {e}")
            await asyncio.sleep(60)
        finally:
            db.close()


async def _execute_signal(signal: str, strat: Strategy, db: Session):
    # Guard: don't double-buy
    open_trade = db.query(Trade).filter(
        Trade.strategy_id == strat.id,
        Trade.symbol == strat.symbol,
        Trade.status == "open",
    ).first()

    if signal == "buy" and open_trade:
        logger.info(f"Strategy {strat.id}: already has open position, skipping buy")
        return

    if signal == "sell" and not open_trade:
        logger.info(f"Strategy {strat.id}: no open position to sell")
        return

    exchange = get_exchange()
    try:
        if signal == "buy":
            # Determine quantity from trade_amount
            ticker = await exchange.fetch_ticker(strat.symbol)
            price = ticker["last"]
            quantity = strat.trade_amount / price

            order = await exchange.create_market_buy_order(strat.symbol, quantity)
            filled_qty = float(order.get("filled", quantity))
            avg_price = float(order.get("average") or price)
            fee = float((order.get("fee") or {}).get("cost") or 0)
            order_id = str(order["id"])

            trade = Trade(
                strategy_id=strat.id,
                symbol=strat.symbol,
                side="buy",
                quantity=filled_qty,
                entry_price=avg_price,
                entry_time=datetime.utcnow(),
                status="open",
                order_id=order_id,
                fees=fee,
            )
            db.add(trade)
            db.commit()
            db.refresh(trade)

            await ws_manager.broadcast_trades({
                "event": "trade_opened",
                "trade": {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "side": trade.side,
                    "quantity": trade.quantity,
                    "entry_price": trade.entry_price,
                },
            })
            logger.info(f"Strategy {strat.id}: opened BUY {filled_qty} {strat.symbol} @ {avg_price}")

        elif signal == "sell" and open_trade:
            order = await exchange.create_market_sell_order(strat.symbol, open_trade.quantity)
            avg_price = float(order.get("average") or 0)
            fee = float((order.get("fee") or {}).get("cost") or 0)

            open_trade.exit_price = avg_price
            open_trade.exit_time = datetime.utcnow()
            open_trade.status = "closed"
            open_trade.fees = (open_trade.fees or 0) + fee
            pnl_data = calculate_trade_pnl(open_trade)
            open_trade.pnl = pnl_data["pnl"]
            open_trade.pnl_pct = pnl_data["pnl_pct"]
            db.commit()

            await ws_manager.broadcast_trades({
                "event": "trade_closed",
                "trade": {
                    "id": open_trade.id,
                    "symbol": open_trade.symbol,
                    "pnl": open_trade.pnl,
                    "pnl_pct": open_trade.pnl_pct,
                },
            })
            logger.info(f"Strategy {strat.id}: closed SELL {open_trade.symbol} @ {avg_price}, PnL={open_trade.pnl}")

    except Exception as e:
        logger.error(f"Order execution failed: {e}")
    finally:
        await exchange.close()


def start_strategy(strategy_id: int):
    if strategy_id in _strategy_tasks and not _strategy_tasks[strategy_id].done():
        return
    task = asyncio.create_task(_run_strategy(strategy_id))
    _strategy_tasks[strategy_id] = task


def stop_strategy(strategy_id: int):
    task = _strategy_tasks.get(strategy_id)
    if task and not task.done():
        task.cancel()
    _strategy_tasks.pop(strategy_id, None)


def restore_active_strategies():
    """Re-start strategies that were active when the server last shut down."""
    db = SessionLocal()
    try:
        active = db.query(Strategy).filter(Strategy.is_active.is_(True)).all()
        for strat in active:
            start_strategy(strat.id)
        logger.info(f"Restored {len(active)} active strategies")
    finally:
        db.close()
