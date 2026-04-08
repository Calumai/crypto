import type { TradeSummary } from "@/types";

export default function TradeStats({ summary }: { summary: TradeSummary }) {
  const stats = [
    {
      label: "總損益",
      value: `${summary.total_pnl >= 0 ? "+" : ""}${summary.total_pnl.toFixed(4)} USDT`,
      color: summary.total_pnl >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: "勝率",
      value: `${(summary.win_rate * 100).toFixed(1)}%`,
      color: "text-blue-400",
    },
    {
      label: "總交易次數",
      value: String(summary.total_trades),
      color: "text-slate-300",
    },
    {
      label: "持倉中",
      value: String(summary.open_positions),
      color: "text-yellow-400",
    },
    {
      label: "最佳交易",
      value: `+${summary.best_trade.toFixed(4)}`,
      color: "text-green-400",
    },
    {
      label: "最差交易",
      value: `${summary.worst_trade.toFixed(4)}`,
      color: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">{s.label}</p>
          <p className={`text-base font-semibold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
