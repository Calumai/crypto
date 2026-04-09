const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  // Market
  getSymbols: () => request<{ symbols: string[] }>("/market/symbols"),
  getTicker: (symbol: string) => request<import("@/types").Ticker>(`/market/ticker/${encodeURIComponent(symbol)}`),
  getOHLCV: (symbol: string, timeframe = "1h", limit = 100) =>
    request<import("@/types").OHLCVCandle[]>(`/market/ohlcv/${encodeURIComponent(symbol)}?timeframe=${timeframe}&limit=${limit}`),
  getBalance: () => request<{ usdt_balance: number | null; usdt_free?: number; error?: string }>("/market/balance"),

  // Trades
  getTrades: (params?: { symbol?: string; status?: string; strategy_id?: number; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.symbol) q.set("symbol", params.symbol);
    if (params?.status) q.set("status", params.status);
    if (params?.strategy_id !== undefined) q.set("strategy_id", String(params.strategy_id));
    if (params?.page) q.set("page", String(params.page));
    return request<import("@/types").Trade[]>(`/trades?${q}`);
  },
  getTradeSummary: () => request<import("@/types").TradeSummary>("/trades/stats/summary"),
  getPnLSeries: () => request<import("@/types").PnLPoint[]>("/trades/stats/pnl-series"),
  placeManualOrder: (body: { symbol: string; side: string; usdt_amount: number; trading_type?: string; leverage?: number }) =>
    request<import("@/types").Trade>("/trades/manual", { method: "POST", body: JSON.stringify(body) }),

  // Auto Zone
  getAutoZone: () => request<import("@/types").AutoZone>("/auto-zone"),
  toggleAutoZone: () => request<{ is_active: boolean }>("/auto-zone/toggle", { method: "POST" }),
  updateAutoZone: (body: Partial<import("@/types").AutoZone>) =>
    request<import("@/types").AutoZone>("/auto-zone", { method: "PUT", body: JSON.stringify(body) }),

  // Strategies
  getStrategies: () => request<import("@/types").Strategy[]>("/strategies"),
  createStrategy: (body: Omit<import("@/types").Strategy, "id" | "is_active" | "created_at" | "updated_at">) =>
    request<import("@/types").Strategy>("/strategies", { method: "POST", body: JSON.stringify(body) }),
  updateStrategy: (id: number, body: Partial<import("@/types").Strategy>) =>
    request<import("@/types").Strategy>(`/strategies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  closeTrade: (id: number) =>
    request<import("@/types").Trade>(`/trades/close/${id}`, { method: "POST" }),
  deleteStrategy: (id: number) =>
    request<{ detail: string }>(`/strategies/${id}`, { method: "DELETE" }),
  toggleStrategy: (id: number) =>
    request<import("@/types").Strategy>(`/strategies/${id}/toggle`, { method: "POST" }),

  // API Keys
  getApiKeys: () => request<import("@/types").ApiKey[]>("/keys"),
  createApiKey: (body: { exchange: string; api_key: string; secret_key: string; is_testnet: boolean }) =>
    request<import("@/types").ApiKey>("/keys", { method: "POST", body: JSON.stringify(body) }),
  deleteApiKey: (id: number) =>
    request<{ detail: string }>(`/keys/${id}`, { method: "DELETE" }),
  testApiKey: (id: number) =>
    request<{ status: string; usdt_balance: number }>(`/keys/${id}/test`, { method: "POST" }),
};
