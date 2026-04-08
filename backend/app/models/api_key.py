from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    exchange = Column(String, default="binance", nullable=False)
    api_key = Column(String, nullable=False)
    secret_key = Column(String, nullable=False)  # stored encrypted
    is_testnet = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
