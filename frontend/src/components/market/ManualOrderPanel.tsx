"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import useSWR from "swr";
import type { IndicatorResult, IndicatorId } from "@/lib/indicators";

const MIN_NOTIONAL = 10; // Binance minimum order value in USDT

interface Props {
  symbol: string;
  indicatorResult?: IndicatorResult | null;
  indicatorId?: IndicatorId;
  onDone?: () => void;
}

const SIGNAL_COLOR = {
  buy:  "bg-green-950 border-green-700/50 text-green-400",
  sell: "bg-red-950 border-red-700/50 text-red-400",
  hold: "bg-slate-800 border-slate-700 text-slate-400",
};

const LEVERAGES = [5, 10, 20, 50];

export default function ManualOrderPanel({ symbol, indicatorResult, indicatorId, onDone }: Props) {
  const signal = indicatorResult?.signal ?? "hold";
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [usdtAmount, setUsdtAmount] = useState("100");
  const [tradingType, setTradingType] = useState<"spot" | "future">("spot");
  const [leverage, setLeverage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { data: ticker } = useSWR(
    ["ticker", symbol],
    () => api.getTicker(symbol),
    { refreshInterval: 5000 }
  );

  const { data: openTrades, mutate: refreshTrades } = useSWR(
    ["open-trades", symbol],
    () => api.getTrades({ symbol, status: "open" }),
    { refreshInterval: 10000 }
  );

  const openQty = openTrades?.reduce((s, t) => s + (t.side === "buy" ? t.quantity : 0), 0) ?? 0;
  // 合約可直接開空，不需要先有持倉；現貨才需要有買入持倉才能賣
  const hasOpenPosition = tradingType === "future" ? true : openQty > 0;

  const currentPrice = ticker?.price ?? 0;
  const usdt = parseFloat(usdtAmount || "0");
  const quantity = currentPrice > 0 ? usdt / currentPrice : 0;
  const belowMin = usdt > 0 && usdt < MIN_NOTIONAL;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (belowMin || usdt <= 0) return;
    setLoading(true);
    setMsg(null);
    try {
      const trade = await api.placeManualOrder({ symbol, side, usdt_amount: usdt, trading_type: tradingType, leverage });
      setMsg({ text: `${side === "buy" ? "買入" : "賣出"}成功，入場價 ${trade.entry_price.toFixed(2)}`, ok: true });
      setUsdtAmount("100");
      refreshTrades();
      onDone?.();
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : "下單失敗", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300">手動下單 — {symbol}</h3>
        <div className="flex gap-1">
          {(["spot", "future"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTradingType(t)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                tradingType === t ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
              }`}
            >
              {t === "spot" ? "現貨" : "合約"}
            </button>
          ))}
        </div>
      </div>
      {tradingType === "future" && (
        <div className="flex gap-1 mb-2">
          {LEVERAGES.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLeverage(lv)}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                leverage === lv ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-400"
              }`}
            >
              {lv}x
            </button>
          ))}
        </div>
      )}
      <div className={`border rounded-lg px-3 py-2 text-xs mb-3 ${SIGNAL_COLOR[signal]}`}>
        <div className="flex items-center justify-between font-semibold">
          <span>
            {signal === "buy" ? "▲ 建議買入" : signal === "sell" ? "▼ 建議賣出" : "— 觀望中"}
            {indicatorResult && <span className="ml-1 opacity-70">({indicatorResult.label})</span>}
          </span>
          {indicatorResult && (
            <span className="text-sm font-bold">{indicatorResult.probability}%</span>
          )}
        </div>
        {indicatorResult && (
          <div className="mt-1.5">
            <div className="w-full bg-black/20 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  signal === "buy" ? "bg-green-400" : signal === "sell" ? "bg-red-400" : "bg-slate-400"
                }`}
                style={{ width: `${indicatorResult.probability}%` }}
              />
            </div>
            <div className="mt-1 opacity-80">{indicatorResult.detail}</div>
          </div>
        )}
      </div>
      {indicatorId === "rsi" && (
        <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-1.5 mb-2 flex justify-between">
          <span>RSI &lt; {30} → 買入</span>
          <span>RSI &gt; {70} → 賣出</span>
          <span className="text-slate-600">自動平倉 ±0.5%</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        {hasOpenPosition && (
          <div className="bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 flex justify-between">
            <span>持倉數量</span>
            <span className="text-slate-200 font-mono">{openQty.toFixed(6)} {symbol.split("/")[0]}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSide("buy")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              side === "buy" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {tradingType === "future" ? "做多" : "買入"}
          </button>
          <button
            type="button"
            onClick={() => setSide("sell")}
            disabled={!hasOpenPosition}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              side === "sell" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {tradingType === "future" ? "做空" : `賣出${!hasOpenPosition ? " (無持倉)" : ""}`}
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">金額 (USDT)</label>
          <input
            required
            type="number"
            min={MIN_NOTIONAL}
            step={1}
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none ${
              belowMin ? "border-red-500 focus:border-red-500" : "border-slate-700 focus:border-blue-500"
            }`}
          />
          {currentPrice > 0 && usdt > 0 && (
            <p className={`text-xs mt-1 ${belowMin ? "text-red-400" : "text-slate-500"}`}>
              ≈ {quantity.toFixed(6)} {symbol.split("/")[0]}
              {belowMin && `（最低 ${MIN_NOTIONAL} USDT）`}
            </p>
          )}
        </div>

        {msg && (
          <p className={`text-xs ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
        )}

        <button
          type="submit"
          disabled={loading || belowMin}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            side === "buy" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {loading ? "下單中..." : `確認${side === "buy" ? (tradingType === "future" ? "做多" : "買入") : (tradingType === "future" ? "做空" : "賣出")}`}
        </button>
      </form>
    </div>
  );
}
