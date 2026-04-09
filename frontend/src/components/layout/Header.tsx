"use client";

import { usePriceStream } from "@/hooks/usePriceStream";
import useSWR from "swr";
import { api } from "@/lib/api";

export default function Header() {
  const tickers = usePriceStream();
  const btc = tickers["BTCUSDT"];
  const connected = Object.keys(tickers).length > 0;

  const { data: balance } = useSWR("balance", api.getBalance, { refreshInterval: 30000 });

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-yellow-400"} animate-pulse`}
        />
        <span className="text-sm text-slate-400">
          {connected ? "即時連線中" : "連線中..."}
        </span>
      </div>
      <div className="flex items-center gap-6">
        {balance?.usdt_balance != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">餘額</span>
            <span className="text-sm font-mono font-semibold text-yellow-300">
              {balance.usdt_balance.toFixed(2)} USDT
            </span>
            {balance.usdt_free != null && balance.usdt_free !== balance.usdt_balance && (
              <span className="text-xs text-slate-500">
                (可用 {balance.usdt_free.toFixed(2)})
              </span>
            )}
          </div>
        )}
        {btc && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">BTC/USDT</span>
            <span className="text-white font-mono font-semibold">
              ${btc.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <span
              className={`text-sm font-medium ${
                btc.change_24h >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {btc.change_24h >= 0 ? "+" : ""}
              {btc.change_24h.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
