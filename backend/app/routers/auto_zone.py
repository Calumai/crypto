from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auto_zone import AutoZone
from app.models.trade import Trade
from app.services import auto_zone_engine

router = APIRouter(prefix="/auto-zone", tags=["auto-zone"])


class AutoZoneUpdate(BaseModel):
    budget_usdt: float | None = None
    symbol: str | None = None
    timeframe: str | None = None
    trading_type: str | None = None
    leverage: int | None = None
    rsi_buy: float | None = None
    rsi_sell: float | None = None
    stop_loss_pct: float | None = None
    take_profit_pct: float | None = None


def _get_or_create(db: Session) -> AutoZone:
    zone = db.query(AutoZone).first()
    if not zone:
        zone = AutoZone()
        db.add(zone)
        db.commit()
        db.refresh(zone)
    return zone


def _stats(zone: AutoZone, db: Session) -> dict:
    trades = (
        db.query(Trade)
        .filter(Trade.notes == "auto_zone", Trade.symbol == zone.symbol)
        .all()
    )
    closed = [t for t in trades if t.status == "closed"]
    open_trade = next((t for t in trades if t.status == "open"), None)

    total_pnl = sum(t.pnl or 0 for t in closed)
    wins = sum(1 for t in closed if (t.pnl or 0) > 0)
    win_rate = wins / len(closed) if closed else 0

    return {
        "total_trades": len(closed),
        "total_pnl": round(total_pnl, 4),
        "win_rate": round(win_rate * 100, 1),
        "open_trade": {
            "id": open_trade.id,
            "entry_price": open_trade.entry_price,
            "quantity": open_trade.quantity,
            "entry_time": open_trade.entry_time.isoformat() if open_trade.entry_time else None,
        } if open_trade else None,
    }


@router.get("")
def get_auto_zone(db: Session = Depends(get_db)):
    zone = _get_or_create(db)
    return {
        "is_active": zone.is_active,
        "budget_usdt": zone.budget_usdt,
        "symbol": zone.symbol,
        "timeframe": zone.timeframe,
        "trading_type": zone.trading_type,
        "leverage": zone.leverage,
        "rsi_buy": zone.rsi_buy,
        "rsi_sell": zone.rsi_sell,
        "stop_loss_pct": zone.stop_loss_pct,
        "take_profit_pct": zone.take_profit_pct,
        **_stats(zone, db),
    }


@router.post("/toggle")
def toggle_auto_zone(db: Session = Depends(get_db)):
    zone = _get_or_create(db)
    zone.is_active = not zone.is_active
    db.commit()
    db.refresh(zone)
    if zone.is_active:
        auto_zone_engine.start_auto_zone()
    else:
        auto_zone_engine.stop_auto_zone()
    return {"is_active": zone.is_active}


@router.put("")
def update_auto_zone(body: AutoZoneUpdate, db: Session = Depends(get_db)):
    zone = _get_or_create(db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(zone, field, value)
    db.commit()
    db.refresh(zone)
    return {
        "is_active": zone.is_active,
        "budget_usdt": zone.budget_usdt,
        "symbol": zone.symbol,
        "timeframe": zone.timeframe,
        "trading_type": zone.trading_type,
        "leverage": zone.leverage,
        "rsi_buy": zone.rsi_buy,
        "rsi_sell": zone.rsi_sell,
        "stop_loss_pct": zone.stop_loss_pct,
        "take_profit_pct": zone.take_profit_pct,
        **_stats(zone, db),
    }
