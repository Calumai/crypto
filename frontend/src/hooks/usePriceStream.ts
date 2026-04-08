"use client";

import { useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import type { Ticker } from "@/types";

export function usePriceStream() {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});

  const handleMessage = useCallback((data: unknown) => {
    const tick = data as Ticker;
    if (tick.symbol) {
      setTickers((prev) => ({ ...prev, [tick.symbol]: tick }));
    }
  }, []);

  useWebSocket("/ws/prices", handleMessage);

  return tickers;
}
