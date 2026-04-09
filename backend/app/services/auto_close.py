"""
Global auto-close monitor: closes any open trade that moves ±10% from entry price.
Runs as a background asyncio task.
"""
import asyncio
import logging
from datetime import datetime

from app.database import SessionLocal
from app.models.trade import Trade
from app.services import exchange as exc_service
from app.services.pnl_calculator import calculate_trade_pnl
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

AUTO_CLOSE_PCT = 0.005  # ±0.5%
CHECK_INTERVAL = 30     # seconds

_task: asyncio.Task | None = None


async def _monitor():
    logger.info("Auto-close monitor started (±10%)")
    while True:
        await asyncio.sleep(CHECK_INTERVAL)
        db = SessionLocal()
        try:
            open_trades = db.query(Trade).filter(Trade.status == "open").all()
            if not open_trades:
                continue

            # Fetch current prices for unique symbols
            symbols = list({t.symbol for t in open_trades})
            prices: dict[str, float] = {}
            for sym in symbols:
                try:
                    exchange = exc_service.get_public_exchange()
                    ticker = await exchange.fetch_ticker(sym)
                    await exchange.close()
                    prices[sym] = ticker["last"]
                except Exception as e:
                    logger.warning(f"Failed to fetch price for {sym}: {e}")

            for trade in open_trades:
                price = prices.get(trade.symbol)
                if not price or not trade.entry_price:
                    continue

                change = (price - trade.entry_price) / trade.entry_price

                if abs(change) < AUTO_CLOSE_PCT:
                    continue

                reason = "止盈 +0.5%" if change >= AUTO_CLOSE_PCT else "止損 -0.5%"
                logger.info(f"Auto-close #{trade.id} {trade.symbol} @ {price} ({change:.2%}) — {reason}")

                try:
                    ex = exc_service.get_exchange()
                    order = await ex.create_market_sell_order(trade.symbol, trade.quantity)
                    await ex.close()

                    exit_price = float(order.get("average") or price)
                    fee = float((order.get("fee") or {}).get("cost") or 0)

                    trade.exit_price = exit_price
                    trade.exit_time = datetime.utcnow()
                    trade.status = "closed"
                    trade.fees = (trade.fees or 0) + fee
                    pnl_data = calculate_trade_pnl(trade)
                    trade.pnl = pnl_data["pnl"]
                    trade.pnl_pct = pnl_data["pnl_pct"]
                    db.commit()

                    await ws_manager.broadcast_trades({
                        "event": "trade_closed",
                        "reason": reason,
                        "trade": {
                            "id": trade.id,
                            "symbol": trade.symbol,
                            "pnl": trade.pnl,
                            "pnl_pct": trade.pnl_pct,
                        },
                    })
                except Exception as e:
                    logger.error(f"Auto-close order failed for #{trade.id}: {e}")

        except Exception as e:
            logger.error(f"Auto-close monitor error: {e}")
        finally:
            db.close()


def start_auto_close():
    global _task
    _task = asyncio.create_task(_monitor())


def stop_auto_close():
    global _task
    if _task and not _task.done():
        _task.cancel()
