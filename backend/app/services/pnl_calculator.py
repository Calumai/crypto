from app.models.trade import Trade


def calculate_trade_pnl(trade: Trade) -> dict:
    if trade.status != "closed" or trade.exit_price is None:
        return {"pnl": None, "pnl_pct": None}

    cost_basis = trade.entry_price * trade.quantity
    gross = (trade.exit_price - trade.entry_price) * trade.quantity
    if trade.side == "sell":
        gross = -gross
    net = gross - (trade.fees or 0.0)
    pct = (net / cost_basis) * 100 if cost_basis else 0.0
    return {"pnl": round(net, 6), "pnl_pct": round(pct, 4)}


def get_summary(trades: list[Trade]) -> dict:
    closed = [t for t in trades if t.status == "closed" and t.pnl is not None]
    winners = [t for t in closed if (t.pnl or 0) > 0]
    open_pos = [t for t in trades if t.status == "open"]

    total_pnl = sum(t.pnl for t in closed)
    return {
        "total_pnl": round(total_pnl, 6),
        "win_rate": len(winners) / len(closed) if closed else 0.0,
        "total_trades": len(closed),
        "open_positions": len(open_pos),
        "avg_pnl_per_trade": round(total_pnl / len(closed), 6) if closed else 0.0,
        "best_trade": max((t.pnl for t in closed), default=0.0),
        "worst_trade": min((t.pnl for t in closed), default=0.0),
    }


def get_pnl_series(trades: list[Trade]) -> list[dict]:
    closed = sorted(
        [t for t in trades if t.status == "closed" and t.pnl is not None and t.exit_time],
        key=lambda t: t.exit_time,
    )
    cumulative = 0.0
    series = []
    for t in closed:
        cumulative += t.pnl
        series.append({"time": t.exit_time.isoformat(), "value": round(cumulative, 6)})
    return series
