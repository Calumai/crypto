"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

export default function StrategyForm({ onCreated, onCancel }: Props) {
  const [type, setType] = useState<"ma_crossover" | "rsi">("ma_crossover");
  const [form, setForm] = useState({
    name: "",
    symbol: "BTC/USDT",
    timeframe: "5m",
    trade_amount: 100,
    stop_loss_pct: "",
    take_profit_pct: "",
    // MA params
    fast_period: 9,
    slow_period: 21,
    // RSI + SNR params
    rsi_period: 14,
    oversold: 30,
    overbought: 70,
    snr_lookback: 20,
    snr_proximity: 0.005,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params: Record<string, number> =
        type === "ma_crossover"
          ? { fast_period: form.fast_period, slow_period: form.slow_period }
          : {
              period: form.rsi_period,
              oversold: form.oversold,
              overbought: form.overbought,
              snr_lookback: form.snr_lookback,
              snr_proximity: form.snr_proximity,
            };

      await api.createStrategy({
        name: form.name,
        strategy_type: type,
        symbol: form.symbol,
        timeframe: form.timeframe,
        parameters: params,
        trade_amount: form.trade_amount,
        stop_loss_pct: form.stop_loss_pct ? parseFloat(form.stop_loss_pct) / 100 : null,
        take_profit_pct: form.take_profit_pct ? parseFloat(form.take_profit_pct) / 100 : null,
      });
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "建立失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">新增策略</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">策略名稱</label>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="我的 BTC 策略"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">策略類型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "ma_crossover" | "rsi")}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="ma_crossover">MA 均線交叉</option>
            <option value="rsi">RSI 超買超賣</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">交易標的</label>
          <input
            required
            value={form.symbol}
            onChange={(e) => set("symbol", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="BTC/USDT"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">時間框架</label>
          <select
            value={form.timeframe}
            onChange={(e) => set("timeframe", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">每次金額 (USDT)</label>
          <input
            required
            type="number"
            min={10}
            value={form.trade_amount}
            onChange={(e) => set("trade_amount", parseFloat(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">止損 % (選填)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.stop_loss_pct}
            onChange={(e) => set("stop_loss_pct", e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="例: 2"
          />
        </div>
      </div>

      {/* Strategy-specific params */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs text-slate-400 mb-3">策略參數</p>
        {type === "ma_crossover" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">快線週期</label>
              <input type="number" min={1} value={form.fast_period}
                onChange={(e) => set("fast_period", parseInt(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">慢線週期</label>
              <input type="number" min={1} value={form.slow_period}
                onChange={(e) => set("slow_period", parseInt(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">RSI 週期</label>
                <input type="number" min={2} value={form.rsi_period}
                  onChange={(e) => set("rsi_period", parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">超賣 (買入)</label>
                <input type="number" min={0} max={50} value={form.oversold}
                  onChange={(e) => set("oversold", parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">超買 (賣出)</label>
                <input type="number" min={50} max={100} value={form.overbought}
                  onChange={(e) => set("overbought", parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <p className="text-xs text-blue-400">SNR 水平位過濾</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">回溯 K 棒數</label>
                <input type="number" min={5} max={200} value={form.snr_lookback}
                  onChange={(e) => set("snr_lookback", parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">水平位容忍範圍 (0.5% = 0.005)</label>
                <input type="number" min={0.001} max={0.05} step={0.001} value={form.snr_proximity}
                  onChange={(e) => set("snr_proximity", parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "建立中..." : "建立策略"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
          取消
        </button>
      </div>
    </form>
  );
}
