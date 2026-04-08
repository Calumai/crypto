from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.trade import Trade
from app.schemas.trade import ManualOrderCreate, TradeResponse, TradeSummary, PnLPoint
from app.services import exchange as exc_service
from app.services.pnl_calculator import calculate_trade_pnl, get_summary, get_pnl_series

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("", response_model=list[TradeResponse])
def list_trades(
    symbol: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Trade)
    if symbol:
        q = q.filter(Trade.symbol == symbol)
    if status:
        q = q.filter(Trade.status == status)
    q = q.order_by(Trade.entry_time.desc())
    offset = (page - 1) * page_size
    return q.offset(offset).limit(page_size).all()


@router.get("/stats/summary", response_model=TradeSummary)
def trade_summary(db: Session = Depends(get_db)):
    trades = db.query(Trade).all()
    return get_summary(trades)


@router.get("/stats/pnl-series", response_model=list[PnLPoint])
def pnl_series(db: Session = Depends(get_db)):
    trades = db.query(Trade).all()
    return get_pnl_series(trades)


@router.get("/{trade_id}", response_model=TradeResponse)
def get_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.post("/manual", response_model=TradeResponse)
async def manual_order(body: ManualOrderCreate, db: Session = Depends(get_db)):
    try:
        result = await exc_service.place_market_order(body.symbol, body.side, body.quantity)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    trade = Trade(
        symbol=result["symbol"],
        side=result["side"],
        quantity=result["quantity"],
        entry_price=result["entry_price"],
        entry_time=datetime.utcnow(),
        status="open",
        order_id=result["order_id"],
        fees=result["fees"],
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade
