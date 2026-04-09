from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base


class AutoZone(Base):
    __tablename__ = "auto_zone"

    id = Column(Integer, primary_key=True)
    is_active = Column(Boolean, default=False)
    budget_usdt = Column(Float, default=300.0)
    symbol = Column(String, default="BTC/USDT")
    timeframe = Column(String, default="15m")
    trading_type = Column(String, default="future")  # "spot" | "future"
    leverage = Column(Integer, default=10)
    rsi_buy = Column(Float, default=30.0)
    rsi_sell = Column(Float, default=70.0)
    stop_loss_pct = Column(Float, default=2.0)    # 2%
    take_profit_pct = Column(Float, default=2.0)  # 2%
