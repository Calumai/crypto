from fastapi import APIRouter, HTTPException, Query
from app.services.exchange import fetch_ticker, fetch_ohlcv, fetch_symbols, get_exchange
from app.database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/symbols")
async def get_symbols():
    try:
        symbols = await fetch_symbols()
        return {"symbols": symbols}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/ticker/{symbol:path}")
async def get_ticker(symbol: str):
    try:
        return await fetch_ticker(symbol)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/ohlcv/{symbol:path}")
async def get_ohlcv(
    symbol: str,
    timeframe: str = Query("1h"),
    limit: int = Query(100, le=500),
):
    try:
        return await fetch_ohlcv(symbol, timeframe, limit)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/balance")
async def get_balance(db: Session = Depends(get_db)):
    """Fetch USDT balance from configured API key."""
    from app.models.api_key import ApiKey
    from app.routers.api_keys import decrypt
    key = db.query(ApiKey).first()
    if not key:
        return {"usdt_balance": None, "error": "no_key"}
    try:
        exchange = get_exchange(key.api_key, decrypt(key.secret_key), testnet=key.is_testnet)
        balance = await exchange.fetch_balance()
        await exchange.close()
        usdt = balance.get("USDT", {})
        return {
            "usdt_balance": float(usdt.get("total", 0)),
            "usdt_free": float(usdt.get("free", 0)),
        }
    except Exception as e:
        return {"usdt_balance": None, "error": str(e)}
