"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { usePriceStream } from "@/hooks/usePriceStream";

const TIMEFRAMES = ["5m", "15m", "30m", "1h"];
const LEVERAGES = [5, 10, 20, 50];
const SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT"];

export default function AutoZonePanel() {
  const { data: zone, mutate } = useSWR("auto-zone", api.getAutoZone, { refreshInterval: 15000 });
  const tickers = usePriceStream();
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  if (!zone) return null;

  const symbolKey = zone.symbol.replace("/", "");
  const livePrice = tickers[symbolKey]?.price ?? 0;

  // Unrealized PnL on open trade
  let unrealizedPnl: number | null = null;
  let unrealizedPct: number | null = null;
  if (zone.open_trade && livePrice > 0) {
    const diff = livePrice - zone.open_trade.entry_price;
    unrealizedPnl = diff * zone.open_trade.quantity;
    unrealizedPct = diff / zone.open_trade.entry_price * 100;
  }

  async function toggle() {
    const res = await api.toggleAutoZone();
    mutate({ ...zone!, is_active: res.is_active });
  }

  async function saveBudget() {
    const v = parseFloat(budget);
    if (!v || v < 10) return;
    setSaving(true);
    await api.updateAutoZone({ budget_usdt: v });
    setBudget("");
    await mutate();
    setSaving(false);
  }

  async function updateField(field: string, value: string | number) {
    await api.updateAutoZone({ [field]: value });
    await mutate();
  }

  const pnlColor = (v: number | null) =>
    v === null ? "text-slate-400" : v >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="bg-slate-900 border border-purple-800/40 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${zone.is_active ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
          <h3 className="text-sm font-semibold text-slate-200">自動交易專區</h3>
          <span className="text-xs text-slate-500">{zone.symbol} · {zone.trading_type === "future" ? `合約 ${zone.leverage}x` : "現貨"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="text-slate-500 hover:text-slate-300 text-xs">
            ⚙
          </button>
          <button
            onClick={toggle}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              zone.is_active ? "bg-red-600/80 hover:bg-red-600 text-white" : "bg-green-600/80 hover:bg-green-600 text-white"
            }`}
          >
            {zone.is_active ? "停止" : "啟動"}
          </button>
        </div>
      </div>

      {/* Strategy rules */}
      <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-1.5 mb-3 flex justify-between">
        <span>RSI &lt; {zone.rsi_buy} → 買入</span>
        <span>RSI &gt; {zone.rsi_sell} → 賣出</span>
        <span>SL/TP ±{zone.stop_loss_pct}%</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 mb-0.5">總損益</div>
          <div className={`text-sm font-bold ${pnlColor(zone.total_pnl)}`}>
            {zone.total_pnl >= 0 ? "+" : ""}{zone.total_pnl.toFixed(2)} U
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 mb-0.5">勝率</div>
          <div className="text-sm font-bold text-slate-200">{zone.win_rate}%</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 mb-0.5">交易次數</div>
          <div className="text-sm font-bold text-slate-200">{zone.total_trades}</div>
        </div>
      </div>

      {/* Open position */}
      {zone.open_trade ? (
        <div className="bg-blue-950/50 border border-blue-800/40 rounded-lg px-3 py-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-blue-400 font-semibold">持倉中</span>
            <span className={`font-bold ${pnlColor(unrealizedPnl)}`}>
              {unrealizedPnl !== null ? `${unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)} U (${unrealizedPct?.toFixed(2)}%)` : "—"}
            </span>
          </div>
          <div className="text-slate-400 mt-0.5">
            入場 {zone.open_trade.entry_price.toFixed(2)} · 數量 {zone.open_trade.quantity.toFixed(6)}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-slate-600 py-1">等待訊號...</div>
      )}

      {/* Budget */}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span>預算</span>
        <span className="text-slate-200 font-mono">{zone.budget_usdt} USDT</span>
        <span className="text-slate-600">· 間隔 {zone.timeframe}</span>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400 w-14">幣種</span>
            <select
              value={zone.symbol}
              onChange={(e) => updateField("symbol", e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400 w-14">預算</span>
            <input
              type="number"
              placeholder={String(zone.budget_usdt)}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
            />
            <button onClick={saveBudget} disabled={saving} className="bg-blue-600 text-white text-xs px-2 py-1 rounded disabled:opacity-50">
              儲存
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400 w-14">類型</span>
            <div className="flex gap-1">
              {(["spot", "future"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateField("trading_type", t)}
                  className={`px-2 py-1 text-xs rounded ${zone.trading_type === t ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"}`}
                >
                  {t === "spot" ? "現貨" : "合約"}
                </button>
              ))}
            </div>
          </div>
          {zone.trading_type === "future" && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-14">槓桿</span>
              <div className="flex gap-1">
                {LEVERAGES.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => updateField("leverage", lv)}
                    className={`px-2 py-1 text-xs rounded ${zone.leverage === lv ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-400"}`}
                  >
                    {lv}x
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400 w-14">週期</span>
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => updateField("timeframe", tf)}
                  className={`px-2 py-1 text-xs rounded ${zone.timeframe === tf ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-400"}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
