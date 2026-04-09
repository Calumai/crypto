import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.strategy import Strategy
from app.schemas.strategy import StrategyCreate, StrategyUpdate, StrategyResponse
from app.services import strategy_engine

router = APIRouter(prefix="/strategies", tags=["strategies"])


def _to_response(s: Strategy) -> StrategyResponse:
    params = json.loads(s.parameters) if isinstance(s.parameters, str) else s.parameters
    return StrategyResponse(
        id=s.id,
        name=s.name,
        strategy_type=s.strategy_type,
        symbol=s.symbol,
        timeframe=s.timeframe,
        parameters=params,
        is_active=s.is_active,
        trade_amount=s.trade_amount,
        stop_loss_pct=s.stop_loss_pct,
        take_profit_pct=s.take_profit_pct,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("", response_model=list[StrategyResponse])
def list_strategies(db: Session = Depends(get_db)):
    return [_to_response(s) for s in db.query(Strategy).all()]


@router.post("", response_model=StrategyResponse, status_code=201)
def create_strategy(body: StrategyCreate, db: Session = Depends(get_db)):
    strat = Strategy(
        name=body.name,
        strategy_type=body.strategy_type,
        symbol=body.symbol,
        timeframe=body.timeframe,
        parameters=json.dumps(body.parameters),
        trade_amount=body.trade_amount,
        stop_loss_pct=body.stop_loss_pct,
        take_profit_pct=body.take_profit_pct,
    )
    db.add(strat)
    db.commit()
    db.refresh(strat)
    return _to_response(strat)


@router.get("/{strategy_id}", response_model=StrategyResponse)
def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strat = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return _to_response(strat)


@router.put("/{strategy_id}", response_model=StrategyResponse)
def update_strategy(strategy_id: int, body: StrategyUpdate, db: Session = Depends(get_db)):
    strat = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if body.name is not None:
        strat.name = body.name
    if body.parameters is not None:
        strat.parameters = json.dumps(body.parameters)
    if body.trade_amount is not None:
        strat.trade_amount = body.trade_amount
    if body.stop_loss_pct is not None:
        strat.stop_loss_pct = body.stop_loss_pct
    if body.take_profit_pct is not None:
        strat.take_profit_pct = body.take_profit_pct
    db.commit()
    db.refresh(strat)
    return _to_response(strat)


@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strat = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy_engine.stop_strategy(strategy_id)
    db.delete(strat)
    db.commit()
    return {"detail": "deleted"}


@router.post("/{strategy_id}/toggle", response_model=StrategyResponse)
async def toggle_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strat = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")

    strat.is_active = not strat.is_active
    db.commit()
    db.refresh(strat)

    if strat.is_active:
        strategy_engine.start_strategy(strategy_id)
    else:
        strategy_engine.stop_strategy(strategy_id)

    return _to_response(strat)
