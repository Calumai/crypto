# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (from `backend/`)
```bash
python run.py                  # Start dev server on http://localhost:8000
pip install -r requirements.txt
```
Or use `start-backend.bat` from project root (auto-creates venv).

### Frontend (from `frontend/`)
```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```
Or use `start-frontend.bat` from project root.

### Environment
Backend requires `backend/.env`:
```
BINANCE_API_KEY=...
BINANCE_SECRET_KEY=...
USE_TESTNET=true
ENCRYPTION_KEY=...   # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Architecture

**Stack**: FastAPI (Python) backend + Next.js 14 App Router frontend + SQLite via SQLAlchemy.

**Frontend → Backend**: Next.js rewrites `/api/*` → `http://localhost:8000/api/*`. Frontend also connects directly to backend WebSockets at `ws://localhost:8000/ws/prices` and `/ws/trades`.

### Backend (`backend/app/`)
- `main.py` — FastAPI app, lifespan (startup restores active strategies, starts Binance price stream)
- `config.py` — pydantic-settings config from `.env`
- `database.py` — SQLAlchemy setup, SQLite
- `models/` — SQLAlchemy ORM: `Trade`, `Strategy`, `ApiKey`
- `routers/` — Route handlers: `market`, `strategies`, `trades`, `keys`
- `services/`
  - `strategy_engine.py` — Core loop: fetches OHLCV → runs strategy → executes orders via CCXT → saves trades → broadcasts WebSocket
  - `exchange.py` — Async CCXT wrappers for Binance (spot, testnet-aware)
  - `binance_stream.py` — Live price feed via Binance WebSocket
  - `websocket_manager.py` — Manages frontend WebSocket connections
  - `pnl_calculator.py` — PnL computation logic
- `strategies/` — Base class + `MACrossoverStrategy`, `RSIStrategy`; extensible via subclassing

### Frontend (`frontend/src/`)
- `app/` — Next.js pages: `/` dashboard, `/trades`, `/strategies`, `/settings`
- `components/` — `TickerBar`, `PriceChart` (lightweight-charts), `StrategyCard/Form`, `TradeTable`, `PnLChart`
- `hooks/` — `useWebSocket` (generic), `usePriceStream` (feeds Zustand store)
- `lib/api.ts` — All REST API calls; SWR used for caching/revalidation in components
- `types/index.ts` — TypeScript types mirroring backend Pydantic models
- `store/` — Zustand store for live price data

### Key Patterns
- Strategy execution runs as `asyncio` background tasks on configurable intervals (timeframe → seconds mapping in `strategy_engine.py`)
- API secrets encrypted with Fernet before DB storage; masked as `***` in responses
- UI is in Traditional Chinese (zh-TW)
- Strategy parameters stored as JSON strings in DB, parsed at runtime
- Trade PnL: `(exit_price - entry_price) × quantity - fees` with side direction applied
