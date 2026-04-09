import aiohttp
import ccxt.async_support as ccxt
from app.config import settings

# aiodns (c-ares) fails to resolve DNS on some Windows setups.
# Override TCPConnector to always use ThreadedResolver (getaddrinfo in thread pool).
class _PatchedConnector(aiohttp.TCPConnector):
    def __init__(self, *, resolver=None, **kwargs):
        if resolver is None:
            resolver = aiohttp.ThreadedResolver()
        super().__init__(resolver=resolver, **kwargs)

aiohttp.TCPConnector = _PatchedConnector  # type: ignore[misc]


_exchange: ccxt.binance | None = None


def get_exchange(api_key: str = "", secret: str = "", testnet: bool | None = None) -> ccxt.binance:
    """Return a ccxt Binance exchange instance."""
    use_testnet = testnet if testnet is not None else settings.use_testnet
    key = api_key or settings.binance_api_key
    sec = secret or settings.binance_secret_key

    exchange = ccxt.binance({
        "apiKey": key,
        "secret": sec,
        "enableRateLimit": True,
        "options": {
            "defaultType": "spot",
        },
    })

    if use_testnet:
        exchange.set_sandbox_mode(True)

    return exchange


def get_public_exchange() -> ccxt.binance:
    """Return a public (no API key) Binance exchange for market data only."""
    return ccxt.binance({
        "enableRateLimit": True,
        "options": {"defaultType": "spot"},
    })


async def fetch_ticker(symbol: str) -> dict:
    exchange = get_public_exchange()
    try:
        ticker = await exchange.fetch_ticker(symbol)
        return {
            "symbol": symbol,
            "price": ticker["last"],
            "change_24h": ticker["percentage"],
            "volume": ticker["quoteVolume"],
            "high_24h": ticker["high"],
            "low_24h": ticker["low"],
        }
    finally:
        await exchange.close()


async def fetch_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 100) -> list:
    exchange = get_public_exchange()
    try:
        data = await exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
        return [
            {
                "time": int(candle[0] / 1000),
                "open": candle[1],
                "high": candle[2],
                "low": candle[3],
                "close": candle[4],
                "volume": candle[5],
            }
            for candle in data
        ]
    finally:
        await exchange.close()


async def fetch_symbols() -> list[str]:
    exchange = get_public_exchange()
    try:
        markets = await exchange.load_markets()
        usdt_pairs = [s for s in markets if s.endswith("/USDT") and markets[s]["active"]]
        return sorted(usdt_pairs)[:100]
    finally:
        await exchange.close()


async def place_market_order(
    symbol: str,
    side: str,
    amount: float,
    api_key: str = "",
    secret: str = "",
    testnet: bool | None = None,
) -> dict:
    exchange = get_exchange(api_key, secret, testnet)
    try:
        if side == "buy":
            order = await exchange.create_market_buy_order(symbol, amount)
        else:
            order = await exchange.create_market_sell_order(symbol, amount)

        fee = 0.0
        if order.get("fee") and order["fee"].get("cost"):
            fee = float(order["fee"]["cost"])

        return {
            "order_id": str(order["id"]),
            "symbol": symbol,
            "side": side,
            "quantity": float(order.get("filled", amount)),
            "entry_price": float(order.get("average") or order.get("price") or 0),
            "fees": fee,
        }
    finally:
        await exchange.close()
