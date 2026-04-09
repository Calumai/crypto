export interface Ticker {
  symbol: string;
  price: number;
  change_24h: number;
  volume: number;
  high: number;
  low: number;
}

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: number;
  strategy_id: number | null;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  status: "open" | "closed" | "cancelled";
  order_id: string | null;
  pnl: number | null;
  pnl_pct: number | null;
  fees: number;
}

export interface TradeSummary {
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  open_positions: number;
  avg_pnl_per_trade: number;
  best_trade: number;
  worst_trade: number;
}

export interface PnLPoint {
  time: string;
  value: number;
}

export interface Strategy {
  id: number;
  name: string;
  strategy_type: "ma_crossover" | "rsi";
  symbol: string;
  timeframe: string;
  parameters: Record<string, number>;
  is_active: boolean;
  trade_amount: number;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AutoZone {
  is_active: boolean;
  budget_usdt: number;
  symbol: string;
  timeframe: string;
  trading_type: "spot" | "future";
  leverage: number;
  rsi_buy: number;
  rsi_sell: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  total_trades: number;
  total_pnl: number;
  win_rate: number;
  open_trade: {
    id: number;
    entry_price: number;
    quantity: number;
    entry_time: string;
  } | null;
}

export interface ApiKey {
  id: number;
  exchange: string;
  api_key: string;
  secret_key: string;
  is_testnet: boolean;
  created_at: string | null;
}
