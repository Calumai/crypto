from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # 'buy' | 'sell'
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    entry_time = Column(DateTime, server_default=func.now())
    exit_time = Column(DateTime, nullable=True)
    status = Column(String, default="open")  # 'open' | 'closed' | 'cancelled'
    order_id = Column(String, nullable=True)
    pnl = Column(Float, nullable=True)
    pnl_pct = Column(Float, nullable=True)
    fees = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
