import asyncio
from fastapi import WebSocket
from starlette.websockets import WebSocketState


class WebSocketManager:
    def __init__(self):
        self.price_connections: list[WebSocket] = []
        self.trade_connections: list[WebSocket] = []

    async def connect_prices(self, ws: WebSocket):
        await ws.accept()
        self.price_connections.append(ws)

    async def connect_trades(self, ws: WebSocket):
        await ws.accept()
        self.trade_connections.append(ws)

    def disconnect(self, ws: WebSocket, pool: list):
        if ws in pool:
            pool.remove(ws)

    async def broadcast_prices(self, message: dict):
        await self._broadcast(message, self.price_connections)

    async def broadcast_trades(self, message: dict):
        await self._broadcast(message, self.trade_connections)

    async def _broadcast(self, message: dict, pool: list):
        dead = []
        for ws in pool:
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in pool:
                pool.remove(ws)


ws_manager = WebSocketManager()
