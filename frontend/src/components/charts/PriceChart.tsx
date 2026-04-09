"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";
import type { OHLCVCandle, Ticker } from "@/types";

const TIMEFRAME_MS: Record<string, number> = {
  "1m": 60000, "3m": 180000, "5m": 300000, "15m": 900000,
  "30m": 1800000, "1h": 3600000, "4h": 14400000, "1d": 86400000,
};

interface Props {
  candles: OHLCVCandle[];
  liveTick?: Ticker;
  symbol: string;
  timeframe?: string;
}

function calculateMA(data: CandlestickData[], period: number) {
  const result: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, c) => sum + c.close, 0) / period;
    result.push({ time: data[i].time as UTCTimestamp, value: parseFloat(avg.toFixed(4)) });
  }
  return result;
}

export default function PriceChart({ candles, liveTick, symbol, timeframe = "1h" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      width: containerRef.current.clientWidth,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    const chartData: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(chartData);

    // MA9 line
    const ma9Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
    });
    ma9Series.setData(calculateMA(chartData, 9));

    // MA21 line
    const ma21Series = chart.addSeries(LineSeries, {
      color: "#818cf8",
      lineWidth: 1,
    });
    ma21Series.setData(calculateMA(chartData, 21));

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
  }, [candles]);

  // Live tick update — align to current candle's open time to avoid jumping
  useEffect(() => {
    if (!liveTick || !candleSeriesRef.current) return;
    const ms = TIMEFRAME_MS[timeframe] ?? 3600000;
    const candleTime = Math.floor(Date.now() / ms) * (ms / 1000) as UTCTimestamp;
    candleSeriesRef.current.update({
      time: candleTime,
      open: liveTick.price,
      high: liveTick.high || liveTick.price,
      low: liveTick.low || liveTick.price,
      close: liveTick.price,
    });
  }, [liveTick, timeframe]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300">{symbol} K 線圖</h2>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-400 inline-block" />MA9</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block" />MA21</span>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
