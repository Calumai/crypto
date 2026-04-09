"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import TickerBar from "@/components/market/TickerBar";
import PriceChart from "@/components/charts/PriceChart";
import ManualOrderPanel from "@/components/market/ManualOrderPanel";
import StrategyCard from "@/components/strategies/StrategyCard";
import { api } from "@/lib/api";
import { usePriceStream } from "@/hooks/usePriceStream";
import type { OHLCVCandle } from "@/types";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];
const SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"];

export default function Dashboard() {
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);

  const tickers = usePriceStream();
  const symbolKey = symbol.replace("/", "");
  const liveTick = tickers[symbolKey];

  const { data: strategies, mutate: refreshStrategies } = useSWR(
    "strategies",
    api.getStrategies
  );

  useEffect(() => {
    api.getOHLCV(symbol, timeframe, 200).then(setCandles).catch(() => {});
  }, [symbol, timeframe]);

  return (
    <div className="space-y-6">
      <TickerBar />

      <div className="flex items-center gap-3">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                timeframe === tf ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <PriceChart candles={candles} liveTick={liveTick} symbol={symbol} />
        </div>
        <div className="lg:col-span-1">
          <ManualOrderPanel symbol={symbol} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          活躍策略 ({strategies?.filter((s) => s.is_active).length ?? 0})
        </h2>
        {strategies && strategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onUpdate={refreshStrategies}
                onDelete={refreshStrategies}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            尚無策略 — 前往「策略管理」頁面新增
          </div>
        )}
      </div>
    </div>
  );
}
