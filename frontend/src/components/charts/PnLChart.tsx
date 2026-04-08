"use client";

import { useEffect, useRef } from "react";
import { createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";
import type { PnLPoint } from "@/types";

export default function PnLChart({ data }: { data: PnLPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#0f172a" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      width: containerRef.current.clientWidth,
      height: 200,
      timeScale: { timeVisible: true },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
    });

    series.setData(
      data.map((p) => ({
        time: (new Date(p.time).getTime() / 1000) as UTCTimestamp,
        value: p.value,
      }))
    );

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex items-center justify-center h-52 text-slate-500 text-sm">
        尚無已平倉交易
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">累積損益 (USDT)</h3>
      <div ref={containerRef} />
    </div>
  );
}
