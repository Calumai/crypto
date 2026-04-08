"use client";

import { usePriceStream } from "@/hooks/usePriceStream";

const WATCH = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

export default function TickerBar() {
  const tickers = usePriceStream();

  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {WATCH.map((sym) => {
        const t = tickers[sym];
        const up = (t?.change_24h ?? 0) >= 0;
        return (
          <div key={sym} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 min-w-[140px]">
            <p className="text-xs text-slate-400">{sym.replace("USDT", "/USDT")}</p>
            <p className="text-white font-mono font-semibold mt-0.5">
              {t ? `$${t.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
            </p>
            <p className={`text-xs mt-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
              {t ? `${up ? "+" : ""}${t.change_24h.toFixed(2)}%` : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
