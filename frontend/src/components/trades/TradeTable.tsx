"use client";

import { useState } from "react";
import type { Trade } from "@/types";
import { formatDate } from "@/lib/formatters";

interface Props {
  trades: Trade[];
  page: number;
  onPageChange: (p: number) => void;
  onClose?: (trade: Trade) => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-yellow-900 text-yellow-300",
  closed: "bg-slate-700 text-slate-300",
  cancelled: "bg-red-900 text-red-300",
};

export default function TradeTable({ trades, page, onPageChange, onClose }: Props) {
  const [closingId, setClosingId] = useState<number | null>(null);

  async function handleClose(trade: Trade) {
    if (!onClose) return;
    setClosingId(trade.id);
    try {
      await onClose(trade);
    } finally {
      setClosingId(null);
    }
  }

  if (trades.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        尚無交易紀錄
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">標的</th>
              <th className="text-left px-4 py-3">方向</th>
              <th className="text-right px-4 py-3">數量</th>
              <th className="text-right px-4 py-3">入場價</th>
              <th className="text-right px-4 py-3">出場價</th>
              <th className="text-right px-4 py-3">損益</th>
              <th className="text-left px-4 py-3">狀態</th>
              <th className="text-left px-4 py-3">時間</th>
              {onClose && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-400">#{t.id}</td>
                <td className="px-4 py-3 font-medium">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${t.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                    {t.side === "buy" ? "買入" : "賣出"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{t.quantity.toFixed(6)}</td>
                <td className="px-4 py-3 text-right font-mono">{t.entry_price.toFixed(4)}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-400">
                  {t.exit_price ? t.exit_price.toFixed(4) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {t.pnl !== null ? (
                    <span className={t.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                      {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(4)}
                      {t.pnl_pct !== null && (
                        <span className="text-xs ml-1 opacity-70">({t.pnl_pct.toFixed(2)}%)</span>
                      )}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[t.status] || "bg-slate-700 text-slate-300"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(t.entry_time)}</td>
                {onClose && (
                  <td className="px-4 py-3">
                    {t.status === "open" && (
                      <button
                        onClick={() => handleClose(t)}
                        disabled={closingId === t.id}
                        className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded transition-colors disabled:opacity-50"
                      >
                        {closingId === t.id ? "平倉中..." : "平倉"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center px-4 py-3 border-t border-slate-800">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs bg-slate-800 rounded disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          上一頁
        </button>
        <span className="text-xs text-slate-400">第 {page} 頁</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={trades.length < 20}
          className="px-3 py-1.5 text-xs bg-slate-800 rounded disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
