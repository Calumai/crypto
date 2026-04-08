"use client";

import type { Strategy } from "@/types";
import { api } from "@/lib/api";
import { useState } from "react";

interface Props {
  strategy: Strategy;
  onUpdate: () => void;
  onDelete: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  ma_crossover: "MA 均線",
  rsi: "RSI",
};

export default function StrategyCard({ strategy, onUpdate, onDelete }: Props) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await api.toggleStrategy(strategy.id);
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm(`確定要刪除策略「${strategy.name}」？`)) return;
    await api.deleteStrategy(strategy.id);
    onDelete();
  }

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 ${strategy.is_active ? "border-blue-500/50" : "border-slate-800"}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{strategy.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {TYPE_LABEL[strategy.strategy_type] || strategy.strategy_type}
            </span>
            <span className="text-xs text-slate-400">{strategy.symbol}</span>
            <span className="text-xs text-slate-400">{strategy.timeframe}</span>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
            strategy.is_active ? "bg-blue-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              strategy.is_active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
        <div>
          <span>每次金額: </span>
          <span className="text-white">${strategy.trade_amount} USDT</span>
        </div>
        {strategy.stop_loss_pct && (
          <div>
            <span>止損: </span>
            <span className="text-red-400">{(strategy.stop_loss_pct * 100).toFixed(1)}%</span>
          </div>
        )}
        {strategy.take_profit_pct && (
          <div>
            <span>止盈: </span>
            <span className="text-green-400">{(strategy.take_profit_pct * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-slate-500 font-mono bg-slate-800 rounded p-2">
        {JSON.stringify(strategy.parameters)}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-semibold ${strategy.is_active ? "text-green-400" : "text-slate-500"}`}>
          {strategy.is_active ? "● 運行中" : "○ 已停止"}
        </span>
        <button
          onClick={remove}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
