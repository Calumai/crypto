from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    strategy_type = Column(String, nullable=False)  # 'ma_crossover' | 'rsi'
    symbol = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    parameters = Column(Text, nullable=False)  # JSON string
    is_active = Column(Boolean, default=False)
    trade_amount = Column(Float, nullable=False)
    stop_loss_pct = Column(Float, nullable=True)
    take_profit_pct = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
