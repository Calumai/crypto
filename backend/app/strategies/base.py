from abc import ABC, abstractmethod
import pandas as pd


class BaseStrategy(ABC):
    def __init__(self, params: dict):
        self.params = params

    @abstractmethod
    def generate_signal(self, df: pd.DataFrame) -> str:
        """Return 'buy', 'sell', or 'hold'."""
        ...

    def prepare_ohlcv(self, raw: list) -> pd.DataFrame:
        df = pd.DataFrame(raw, columns=["time", "open", "high", "low", "close", "volume"])
        df["time"] = pd.to_datetime(df["time"], unit="s")
        df.set_index("time", inplace=True)
        df = df.astype(float)
        return df
