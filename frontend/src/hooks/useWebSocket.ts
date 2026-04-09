"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWebSocket(path: string, onMessage: (data: unknown) => void) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const backendHost = process.env.NEXT_PUBLIC_BACKEND_WS_URL || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//localhost:8000`;
    const url = `${backendHost}${path}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      reconnectDelay.current = 1000;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch (_) {}
    };

    socket.onclose = () => {
      setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };
  }, [path]);

  useEffect(() => {
    connect();
    const keepAlive = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send("ping");
      }
    }, 20000);
    return () => {
      clearInterval(keepAlive);
      ws.current?.close();
    };
  }, [connect]);
}
