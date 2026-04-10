import pandas as pd
from app.strategies.base import BaseStrategy


class MACrossoverStrategy(BaseStrategy):
    """
    Buy when fast EMA crosses above slow EMA.
    Sell when fast EMA crosses below slow EMA.

    params: { "fast_period": 9, "slow_period": 21 }
    """

    def generate_signal(self, df: pd.DataFrame) -> str:
        fast = df["close"].ewm(span=self.params.get("fast_period", 9), adjust=False).mean()
        slow = df["close"].ewm(span=self.params.get("slow_period", 21), adjust=False).mean()

        if len(fast) < 2:
            return "hold"

        prev_above = fast.iloc[-2] > slow.iloc[-2]
        curr_above = fast.iloc[-1] > slow.iloc[-1]

        if not prev_above and curr_above:
            return "buy"
        if prev_above and not curr_above:
            return "sell"
        return "hold"
