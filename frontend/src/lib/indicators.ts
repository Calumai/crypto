import type { OHLCVCandle } from "@/types";

export type Signal = "buy" | "sell" | "hold";
export type IndicatorId = "rsi" | "ma" | "macd" | "bb";

export interface IndicatorResult {
  signal: Signal;
  label: string;
  detail: string;
  probability: number; // 0–100, strength of current signal
}

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0];
  for (const v of values) {
    prev = v * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

// ── indicators ───────────────────────────────────────────────────────────────

export function calcRSI(candles: OHLCVCandle[], period = 14): IndicatorResult {
  const closes = candles.map((c) => c.close);
  if (closes.length < period + 1) return { signal: "hold", label: "RSI", detail: "資料不足", probability: 50 };

  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  const signal: Signal = rsi < 30 ? "buy" : rsi > 70 ? "sell" : "hold";

  let probability: number;
  if (signal === "buy")       probability = clamp(Math.round(50 + (30 - rsi) * 50 / 30), 50, 100);
  else if (signal === "sell") probability = clamp(Math.round(50 + (rsi - 70) * 50 / 30), 50, 100);
  else                        probability = clamp(Math.round(100 - Math.abs(rsi - 50) * 2), 0, 100);

  return { signal, label: "RSI", detail: `RSI ${rsi.toFixed(1)}`, probability };
}

export function calcMA(candles: OHLCVCandle[], fast = 9, slow = 21): IndicatorResult {
  const closes = candles.map((c) => c.close);
  if (closes.length < slow + 1) return { signal: "hold", label: "EMA", detail: "資料不足", probability: 50 };

  const fastEMA = ema(closes, fast);
  const slowEMA = ema(closes, slow);

  const prevFast = fastEMA[fastEMA.length - 2];
  const prevSlow = slowEMA[slowEMA.length - 2];
  const currFast = fastEMA[fastEMA.length - 1];
  const currSlow = slowEMA[slowEMA.length - 1];

  let signal: Signal = "hold";
  if (prevFast <= prevSlow && currFast > currSlow) signal = "buy";
  else if (prevFast >= prevSlow && currFast < currSlow) signal = "sell";
  else if (currFast > currSlow) signal = "buy";
  else signal = "sell";

  // Probability: how far apart the two EMAs are as a % of price
  const spreadPct = Math.abs(currFast - currSlow) / currSlow * 100;
  const probability = clamp(Math.round(50 + spreadPct * 25), 50, 97);

  return {
    signal,
    label: `EMA ${fast}/${slow}`,
    detail: `快線 ${currFast.toFixed(2)} / 慢線 ${currSlow.toFixed(2)}`,
    probability,
  };
}

export function calcMACD(candles: OHLCVCandle[]): IndicatorResult {
  const closes = candles.map((c) => c.close);
  if (closes.length < 35) return { signal: "hold", label: "MACD", detail: "資料不足", probability: 50 };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);

  const curr = histogram[histogram.length - 1];
  const prev = histogram[histogram.length - 2];
  const macd = macdLine[macdLine.length - 1];
  const sig = signalLine[signalLine.length - 1];

  let signal: Signal = "hold";
  if (prev < 0 && curr > 0) signal = "buy";
  else if (prev > 0 && curr < 0) signal = "sell";
  else if (macd > sig) signal = "buy";
  else signal = "sell";

  // Probability: histogram magnitude relative to signal line
  const sigAbs = Math.abs(sig) || 0.0001;
  const ratio = Math.abs(curr) / sigAbs;
  const probability = clamp(Math.round(50 + ratio * 20), 50, 97);

  return {
    signal,
    label: "MACD",
    detail: `MACD ${macd.toFixed(4)} / 信號 ${sig.toFixed(4)}`,
    probability,
  };
}

export function calcBB(candles: OHLCVCandle[], period = 20, mult = 2): IndicatorResult {
  const closes = candles.map((c) => c.close);
  if (closes.length < period) return { signal: "hold", label: "BB", detail: "資料不足", probability: 50 };

  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b) / period;
  const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period);
  const upper = mid + mult * std;
  const lower = mid - mult * std;
  const price = closes[closes.length - 1];

  let signal: Signal = "hold";
  if (price <= lower) signal = "buy";
  else if (price >= upper) signal = "sell";

  // Probability: how far price is outside the band, measured in std units
  let probability: number;
  if (signal === "buy") {
    const excess = (lower - price) / std;
    probability = clamp(Math.round(50 + excess * 25), 50, 97);
  } else if (signal === "sell") {
    const excess = (price - upper) / std;
    probability = clamp(Math.round(50 + excess * 25), 50, 97);
  } else {
    // Position within band: 100% at centre, 50% near edge
    const pos = Math.abs(price - mid) / (std * mult);
    probability = clamp(Math.round(100 - pos * 50), 50, 100);
  }

  return {
    signal,
    label: `BB(${period})`,
    detail: `上 ${upper.toFixed(2)} / 下 ${lower.toFixed(2)}`,
    probability,
  };
}

export const INDICATORS: { id: IndicatorId; name: string; calc: (c: OHLCVCandle[]) => IndicatorResult }[] = [
  { id: "rsi",  name: "RSI",      calc: calcRSI },
  { id: "ma",   name: "EMA交叉",  calc: calcMA },
  { id: "macd", name: "MACD",     calc: calcMACD },
  { id: "bb",   name: "布林通道", calc: calcBB },
];
