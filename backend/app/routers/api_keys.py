from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet, InvalidToken

from app.database import get_db
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse
from app.config import settings
import ccxt.async_support as ccxt

router = APIRouter(prefix="/keys", tags=["api-keys"])


def get_fernet() -> Fernet | None:
    if settings.encryption_key:
        try:
            return Fernet(settings.encryption_key.encode())
        except Exception:
            return None
    return None


def encrypt(value: str) -> str:
    f = get_fernet()
    if f:
        return f.encrypt(value.encode()).decode()
    return value


def decrypt(value: str) -> str:
    f = get_fernet()
    if f:
        try:
            return f.decrypt(value.encode()).decode()
        except InvalidToken:
            return value
    return value


@router.get("", response_model=list[ApiKeyResponse])
def list_keys(db: Session = Depends(get_db)):
    keys = db.query(ApiKey).all()
    result = []
    for k in keys:
        r = ApiKeyResponse.model_validate(k)
        r.secret_key = "***"
        result.append(r)
    return result


@router.post("", response_model=ApiKeyResponse)
def create_key(body: ApiKeyCreate, db: Session = Depends(get_db)):
    key = ApiKey(
        exchange=body.exchange,
        api_key=body.api_key,
        secret_key=encrypt(body.secret_key),
        is_testnet=body.is_testnet,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    r = ApiKeyResponse.model_validate(key)
    r.secret_key = "***"
    return r


@router.delete("/{key_id}")
def delete_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(key)
    db.commit()
    return {"detail": "deleted"}


@router.post("/{key_id}/test")
async def test_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    secret = decrypt(key.secret_key)
    exchange = ccxt.binance({"apiKey": key.api_key, "secret": secret, "enableRateLimit": True})
    if key.is_testnet:
        exchange.set_sandbox_mode(True)

    try:
        balance = await exchange.fetch_balance()
        total_usdt = balance.get("USDT", {}).get("total", 0)
        await exchange.close()
        return {"status": "ok", "usdt_balance": total_usdt}
    except Exception as e:
        await exchange.close()
        raise HTTPException(status_code=400, detail=str(e))
