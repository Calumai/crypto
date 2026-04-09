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


def get_exchange(
    api_key: str = "",
    secret: str = "",
    testnet: bool | None = None,
    trading_type: str = "spot",
) -> ccxt.binance:
    """Return a ccxt Binance exchange instance."""
    use_testnet = testnet if testnet is not None else settings.use_testnet
    key = api_key or settings.binance_api_key
    sec = secret or settings.binance_secret_key

    if trading_type == "future":
        # Use binanceusdm for futures (supports sandbox mode for futures testnet)
        exchange = ccxt.binanceusdm({
            "apiKey": key,
            "secret": sec,
            "enableRateLimit": True,
        })
        if use_testnet:
            exchange.set_sandbox_mode(True)
    else:
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
    usdt_amount: float | None = None,
    trading_type: str = "spot",
    leverage: int = 1,
) -> dict:
    exchange = get_exchange(api_key, secret, testnet, trading_type)
    try:
        # Set leverage for futures
        if trading_type == "future" and leverage > 1:
            try:
                await exchange.set_leverage(leverage, symbol)
            except Exception:
                pass  # May already be set or not supported for this symbol

        if side == "buy" and usdt_amount is not None:
            # Use quoteOrderQty so Binance calculates the exact base qty from USDT
            order = await exchange.create_order(
                symbol, "market", "buy", None, None,
                {"quoteOrderQty": usdt_amount}
            )
        elif side == "buy":
            order = await exchange.create_market_buy_order(symbol, amount)
        elif side == "sell" and usdt_amount is not None and trading_type == "future":
            # Open short position on futures: calculate base qty from current price
            await exchange.load_markets()
            ticker = await exchange.fetch_ticker(symbol)
            price = ticker["last"]
            raw_qty = usdt_amount / price
            qty = float(exchange.amount_to_precision(symbol, raw_qty))
            order = await exchange.create_market_sell_order(symbol, qty)
        else:
            # Spot sell or close futures long: use reduceOnly for futures
            params = {"reduceOnly": True} if trading_type == "future" else {}
            order = await exchange.create_market_sell_order(symbol, amount, params)

        fee = 0.0
        if order.get("fee") and order["fee"].get("cost"):
            fee = float(order["fee"]["cost"])

        # Derive filled qty: prefer "filled", fall back to cost/average for quoteOrderQty buys
        filled = float(order.get("filled") or 0)
        if filled == 0:
            avg = float(order.get("average") or order.get("price") or 0)
            cost = float(order.get("cost") or 0)
            if avg > 0 and cost > 0:
                filled = cost / avg
            elif amount > 0:
                filled = amount

        return {
            "order_id": str(order["id"]),
            "symbol": symbol,
            "side": side,
            "quantity": filled,
            "entry_price": float(order.get("average") or order.get("price") or 0),
            "fees": fee,
        }
    finally:
        await exchange.close()
