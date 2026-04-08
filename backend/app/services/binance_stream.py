import asyncio
import json
import logging
import websockets
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

DEFAULT_SYMBOLS = ["btcusdt", "ethusdt", "bnbusdt", "solusdt", "xrpusdt"]

_stream_task: asyncio.Task | None = None


async def _run_stream(symbols: list[str]):
    stream_names = [f"{s.lower()}@miniTicker" for s in symbols]
    url = f"wss://stream.binance.com:9443/stream?streams={'/'.join(stream_names)}"

    while True:
        try:
            logger.info(f"Connecting to Binance stream: {url}")
            async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
                async for raw in ws:
                    try:
                        data = json.loads(raw)
                        ticker = data.get("data", {})
                        if not ticker:
                            continue
                        close = float(ticker["c"])
                        open_p = float(ticker["o"])
                        change_24h = ((close - open_p) / open_p * 100) if open_p else 0.0
                        await ws_manager.broadcast_prices({
                            "symbol": ticker["s"],
                            "price": close,
                            "change_24h": round(change_24h, 2),
                            "volume": float(ticker["v"]),
                            "high": float(ticker["h"]),
                            "low": float(ticker["l"]),
                        })
                    except Exception as e:
                        logger.warning(f"Parse error: {e}")
        except asyncio.CancelledError:
            logger.info("Binance stream cancelled")
            return
        except Exception as e:
            logger.warning(f"Stream disconnected: {e}, reconnecting in 5s...")
            await asyncio.sleep(5)


def start_stream(symbols: list[str] | None = None) -> asyncio.Task:
    global _stream_task
    syms = symbols or DEFAULT_SYMBOLS
    _stream_task = asyncio.create_task(_run_stream(syms))
    return _stream_task


def stop_stream():
    global _stream_task
    if _stream_task and not _stream_task.done():
        _stream_task.cancel()
