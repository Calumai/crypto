from pydantic import BaseModel
from datetime import datetime


class ApiKeyCreate(BaseModel):
    exchange: str = "binance"
    api_key: str
    secret_key: str
    is_testnet: bool = True


class ApiKeyResponse(BaseModel):
    id: int
    exchange: str
    api_key: str
    secret_key: str = "***"
    is_testnet: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
