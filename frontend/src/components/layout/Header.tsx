"use client";

import { usePriceStream } from "@/hooks/usePriceStream";

export default function Header() {
  const tickers = usePriceStream();
  const btc = tickers["BTCUSDT"];
  const connected = Object.keys(tickers).length > 0;

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
    </header>
  );
}
