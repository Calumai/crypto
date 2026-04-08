from pydantic import BaseModel
from datetime import datetime


class ManualOrderCreate(BaseModel):
    symbol: str
    side: str  # 'buy' | 'sell'
    quantity: float


class TradeResponse(BaseModel):
    id: int
    strategy_id: int | None
    symbol: str
    side: str
    quantity: float
    entry_price: float
    exit_price: float | None
    entry_time: datetime | None
    exit_time: datetime | None
    status: str
    order_id: str | None
    pnl: float | None
    pnl_pct: float | None
    fees: float

    model_config = {"from_attributes": True}


class TradeSummary(BaseModel):
    total_pnl: float
    win_rate: float
    total_trades: int
    open_positions: int
    avg_pnl_per_trade: float
    best_trade: float
    worst_trade: float


class PnLPoint(BaseModel):
    time: str
    value: float
