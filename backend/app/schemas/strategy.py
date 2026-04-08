from pydantic import BaseModel
from datetime import datetime
from typing import Any


class StrategyCreate(BaseModel):
    name: str
    strategy_type: str
    symbol: str
    timeframe: str
    parameters: dict[str, Any]
    trade_amount: float
    stop_loss_pct: float | None = None
    take_profit_pct: float | None = None


class StrategyUpdate(BaseModel):
    name: str | None = None
    parameters: dict[str, Any] | None = None
    trade_amount: float | None = None
    stop_loss_pct: float | None = None
    take_profit_pct: float | None = None


class StrategyResponse(BaseModel):
    id: int
    name: str
    strategy_type: str
    symbol: str
    timeframe: str
    parameters: dict[str, Any]
    is_active: bool
    trade_amount: float
    stop_loss_pct: float | None
    take_profit_pct: float | None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        import json
        if hasattr(obj, "parameters") and isinstance(obj.parameters, str):
            obj.parameters = json.loads(obj.parameters)
        return super().model_validate(obj, *args, **kwargs)
