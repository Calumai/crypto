import asyncio
import ccxt.async_support as ccxt
from dotenv import load_dotenv
import os

load_dotenv()

async def main():
    exchange = ccxt.binance({
        "apiKey": os.getenv("BINANCE_API_KEY"),
        "secret": os.getenv("BINANCE_SECRET_KEY"),
        "enableRateLimit": True,
    })
    exchange.set_sandbox_mode(True)

    try:
        balance = await exchange.fetch_balance()
        print("連線成功！\n")
        print("帳戶餘額：")
        for asset, data in balance["total"].items():
            if data > 0:
                print(f"  {asset}: {data}")
    except Exception as e:
        print(f"連線失敗：{e}")
    finally:
        await exchange.close()

asyncio.run(main())
