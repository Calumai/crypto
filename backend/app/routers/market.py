from fastapi import APIRouter, HTTPException, Query
from app.services.exchange import fetch_ticker, fetch_ohlcv, fetch_symbols

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
