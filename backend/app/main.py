import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

from app.config import settings
from app.database import create_tables
from app.routers import market, trades, strategies, api_keys
from app.services.binance_stream import start_stream, stop_stream
from app.services.websocket_manager import ws_manager
from app.services.strategy_engine import restore_active_strategies

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    start_stream()
    restore_active_strategies()
    logger.info("Server started")
    yield
    stop_stream()
    logger.info("Server stopped")


app = FastAPI(title="Crypto Trader API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api")
app.include_router(trades.router, prefix="/api")
app.include_router(strategies.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "message": "Crypto Trader API"}


@app.websocket("/ws/prices")
async def ws_prices(websocket: WebSocket):
    await ws_manager.connect_prices(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping/pong
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, ws_manager.price_connections)


@app.websocket("/ws/trades")
async def ws_trades(websocket: WebSocket):
    await ws_manager.connect_trades(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, ws_manager.trade_connections)
