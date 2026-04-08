"use client";

import { useState } from "react";
import useSWR from "swr";
import TradeTable from "@/components/trades/TradeTable";
import TradeStats from "@/components/trades/TradeStats";
import PnLChart from "@/components/charts/PnLChart";
import { api } from "@/lib/api";

export default function TradesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: trades } = useSWR(
    ["trades", page, statusFilter],
    () => api.getTrades({ page, status: statusFilter || undefined })
  );

  const { data: summary } = useSWR("trade-summary", api.getTradeSummary);
  const { data: pnlSeries } = useSWR("pnl-series", api.getPnLSeries);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">交易紀錄</h1>
        <div className="flex gap-2">
          {["", "open", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {s === "" ? "全部" : s === "open" ? "持倉中" : "已平倉"}
            </button>
          ))}
        </div>
      </div>

      {summary && <TradeStats summary={summary} />}

      {pnlSeries && <PnLChart data={pnlSeries} />}

      <TradeTable
        trades={trades ?? []}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
