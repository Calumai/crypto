import pandas as pd
from app.strategies.base import BaseStrategy


def _calc_rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, float("inf"))
    return 100 - 100 / (1 + rs)


class RSIStrategy(BaseStrategy):
    """
    RSI + SNR 融合策略：
    - 在 SNR 支撐位附近，RSI 從超賣回升 → 買入
    - 在 SNR 壓力位附近，RSI 從超買回落 → 賣出

    params: {
        "period": 14,
        "oversold": 30,
        "overbought": 70,
        "snr_lookback": 20,    # 尋找水平位的回溯 K 棒數
        "snr_proximity": 0.005  # 價格距水平位的容忍範圍（0.5%）
    }
    """

    def _find_snr_levels(self, df: pd.DataFrame, lookback: int) -> dict:
        """
        用實體 K 棒（open/close）找出近期 V 字支撐與 A 字壓力。
        忽略影線，只看實體共識。
        """
        recent = df.iloc[-lookback:]
        body_lows = recent[["open", "close"]].min(axis=1)
        body_highs = recent[["open", "close"]].max(axis=1)

        # V 字支撐：前後實體都高於中間點（局部最低實體）
        support = None
        resistance = None
        for i in range(1, len(body_lows) - 1):
            if body_lows.iloc[i] < body_lows.iloc[i - 1] and body_lows.iloc[i] < body_lows.iloc[i + 1]:
                support = body_lows.iloc[i]
            if body_highs.iloc[i] > body_highs.iloc[i - 1] and body_highs.iloc[i] > body_highs.iloc[i + 1]:
                resistance = body_highs.iloc[i]

        return {"support": support, "resistance": resistance}

    def generate_signal(self, df: pd.DataFrame) -> str:
        period = self.params.get("period", 14)
        oversold = self.params.get("oversold", 30)
        overbought = self.params.get("overbought", 70)
        lookback = self.params.get("snr_lookback", 20)
        proximity = self.params.get("snr_proximity", 0.005)

        rsi = _calc_rsi(df["close"], period)
        if rsi is None or len(rsi) < 2:
            return "hold"

        prev_rsi = rsi.iloc[-2]
        curr_rsi = rsi.iloc[-1]
        curr_close = df["close"].iloc[-1]

        levels = self._find_snr_levels(df, lookback)

        # RSI 從超賣回升 + 收盤價在支撐位附近（實體 K 棒確認）
        rsi_buy = prev_rsi < oversold and curr_rsi >= oversold
        near_support = (
            levels["support"] is not None
            and abs(curr_close - levels["support"]) / levels["support"] <= proximity
        )
        if rsi_buy and near_support:
            return "buy"

        # RSI 從超買回落 + 收盤價在壓力位附近
        rsi_sell = prev_rsi > overbought and curr_rsi <= overbought
        near_resistance = (
            levels["resistance"] is not None
            and abs(curr_close - levels["resistance"]) / levels["resistance"] <= proximity
        )
        if rsi_sell and near_resistance:
            return "sell"

        return "hold"
