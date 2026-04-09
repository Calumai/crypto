"""
Auto Zone: RSI-driven bot that trades a fixed USDT budget.
Trades are tagged with notes='auto_zone' for easy filtering.
"""
import asyncio
import logging
from datetime import datetime

from app.database import SessionLocal
from app.models.auto_zone import AutoZone
from app.models.trade import Trade
from app.services import exchange as exc_service
from app.services.pnl_calculator import calculate_trade_pnl
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

TIMEFRAME_SECONDS = {
    "1m": 60, "3m": 180, "5m": 300, "15m": 900,
    "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400,
}
SOURCE_TAG = "auto_zone"

_task: asyncio.Task | None = None


def _calc_rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    changes = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(c, 0) for c in changes]
    losses = [abs(min(c, 0)) for c in changes]
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(changes)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss == 0:
        return 100.0
    return 100 - 100 / (1 + avg_gain / avg_loss)


async def _run():
    logger.info("AutoZone engine started")
    while True:
        db = SessionLocal()
        try:
            zone = db.query(AutoZone).first()
            if not zone or not zone.is_active:
                await asyncio.sleep(30)
                continue

            interval = TIMEFRAME_SECONDS.get(zone.timeframe, 900)

            # Fetch OHLCV
            try:
                pub = exc_service.get_public_exchange()
                ohlcv = await pub.fetch_ohlcv(zone.symbol, zone.timeframe, limit=50)
                ticker = await pub.fetch_ticker(zone.symbol)
                await pub.close()
            except Exception as e:
                logger.warning(f"AutoZone: fetch failed — {e}")
                await asyncio.sleep(60)
                continue

            closes = [c[4] for c in ohlcv]
            current_price = ticker["last"]
            rsi = _calc_rsi(closes, 14)

            if rsi is None:
                await asyncio.sleep(interval)
                continue

            logger.info(f"AutoZone: {zone.symbol} RSI={rsi:.1f} price={current_price}")

            # Find open auto-zone position
            open_trade = (
                db.query(Trade)
                .filter(Trade.notes == SOURCE_TAG, Trade.status == "open",
                        Trade.symbol == zone.symbol)
                .order_by(Trade.entry_time.desc())
                .first()
            )

            # Check SL/TP on open position
            if open_trade and open_trade.entry_price:
                change = (current_price - open_trade.entry_price) / open_trade.entry_price
                sl = zone.stop_loss_pct / 100
                tp = zone.take_profit_pct / 100
                if change <= -sl or change >= tp:
                    reason = f"止盈 +{zone.take_profit_pct}%" if change >= tp else f"止損 -{zone.stop_loss_pct}%"
                    await _close_position(open_trade, current_price, reason, db, zone)
                    open_trade = None

            # Generate signal
            if rsi < zone.rsi_buy and not open_trade:
                await _open_position(zone, current_price, db)
            elif rsi > zone.rsi_sell and open_trade:
                await _close_position(open_trade, current_price, "RSI 超買賣出", db, zone)

            await asyncio.sleep(interval)

        except asyncio.CancelledError:
            logger.info("AutoZone engine stopped")
            break
        except Exception as e:
            logger.error(f"AutoZone error: {e}")
            await asyncio.sleep(60)
        finally:
            db.close()


async def _open_position(zone: AutoZone, current_price: float, db):
    logger.info(f"AutoZone: opening {zone.symbol} @ {current_price} ({zone.trading_type} {zone.leverage}x)")
    try:
        from app.models.api_key import ApiKey
        from app.routers.api_keys import decrypt
        key = db.query(ApiKey).first()
        api_key = key.api_key if key else ""
        secret = decrypt(key.secret_key) if key else ""
        testnet = key.is_testnet if key else None

        result = await exc_service.place_market_order(
            zone.symbol, "buy", 0,
            api_key=api_key, secret=secret, testnet=testnet,
            usdt_amount=zone.budget_usdt,
            trading_type=zone.trading_type,
            leverage=zone.leverage,
        )
        trade = Trade(
            symbol=result["symbol"],
            side="buy",
            quantity=result["quantity"],
            entry_price=result["entry_price"],
            entry_time=datetime.utcnow(),
            status="open",
            order_id=result["order_id"],
            fees=result["fees"],
            notes=SOURCE_TAG,
        )
        db.add(trade)
        db.commit()
        await ws_manager.broadcast_trades({
            "event": "auto_zone_opened",
            "trade": {"symbol": trade.symbol, "entry_price": trade.entry_price},
        })
    except Exception as e:
        logger.error(f"AutoZone open failed: {e}")


async def _close_position(trade: Trade, current_price: float, reason: str, db, zone: AutoZone):
    logger.info(f"AutoZone: closing #{trade.id} @ {current_price} — {reason}")
    try:
        from app.models.api_key import ApiKey
        from app.routers.api_keys import decrypt
        key = db.query(ApiKey).first()
        api_key = key.api_key if key else ""
        secret = decrypt(key.secret_key) if key else ""
        testnet = key.is_testnet if key else None

        result = await exc_service.place_market_order(
            trade.symbol, "sell", trade.quantity,
            api_key=api_key, secret=secret, testnet=testnet,
            trading_type=zone.trading_type,
            leverage=zone.leverage,
        )
        trade.exit_price = result["entry_price"]
        trade.exit_time = datetime.utcnow()
        trade.status = "closed"
        trade.fees = (trade.fees or 0) + result["fees"]
        pnl_data = calculate_trade_pnl(trade)
        trade.pnl = pnl_data["pnl"]
        trade.pnl_pct = pnl_data["pnl_pct"]
        db.commit()
        await ws_manager.broadcast_trades({
            "event": "auto_zone_closed",
            "reason": reason,
            "trade": {"id": trade.id, "pnl": trade.pnl, "pnl_pct": trade.pnl_pct},
        })
    except Exception as e:
        logger.error(f"AutoZone close failed: {e}")


def start_auto_zone():
    global _task
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_run())


def stop_auto_zone():
    global _task
    if _task and not _task.done():
        _task.cancel()
