"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import useSWR from "swr";

const MIN_NOTIONAL = 10; // Binance minimum order value in USDT

interface Props {
  symbol: string;
  onDone?: () => void;
}

export default function ManualOrderPanel({ symbol, onDone }: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { data: ticker } = useSWR(
    ["ticker", symbol],
    () => api.getTicker(symbol),
    { refreshInterval: 5000 }
  );

  const currentPrice = ticker?.price ?? 0;
  const notional = currentPrice * parseFloat(quantity || "0");
  const belowMin = quantity !== "" && notional < MIN_NOTIONAL && notional > 0;
  const minQty = currentPrice > 0 ? (MIN_NOTIONAL / currentPrice) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (belowMin) return;
    setLoading(true);
    setMsg(null);
    try {
      const trade = await api.placeManaualOrder({ symbol, side, quantity: parseFloat(quantity) });
      setMsg({ text: `${side === "buy" ? "買入" : "賣出"}成功，入場價 ${trade.entry_price.toFixed(2)}`, ok: true });
      setQuantity("");
      onDone?.();
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : "下單失敗", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">手動下單 — {symbol}</h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSide("buy")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              side === "buy" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            買入
          </button>
          <button
            type="button"
            onClick={() => setSide("sell")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              side === "sell" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            賣出
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">數量</label>
          <input
            required
            type="number"
            min={0.00001}
            step={0.00001}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={minQty > 0 ? `最少 ${minQty.toFixed(6)}` : "例：0.001"}
            className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none ${
              belowMin ? "border-red-500 focus:border-red-500" : "border-slate-700 focus:border-blue-500"
            }`}
          />
          {currentPrice > 0 && quantity && (
            <p className={`text-xs mt-1 ${belowMin ? "text-red-400" : "text-slate-500"}`}>
              ≈ {notional.toFixed(2)} USDT
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
          {loading ? "下單中..." : `確認${side === "buy" ? "買入" : "賣出"}`}
        </button>
      </form>
    </div>
  );
}
