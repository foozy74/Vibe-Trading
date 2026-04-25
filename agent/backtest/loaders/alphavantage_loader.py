"""Alpha Vantage loader for global equity (US, HK, CN) and forex/macro data.

Alpha Vantage (https://www.alphavantage.co/) provides a robust western-style API
for global financial data. Requires an API key (ALPHAVANTAGE_API_KEY).
"""

from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

import pandas as pd
import requests

from backtest.loaders.registry import register

logger = logging.getLogger(__name__)

# Mapping for common market suffixes
# Alpha Vantage China suffixes: .SHH (Shanghai), .SHZ (Shenzhen)
# Vibe-Trading suffixes: .SH (Shanghai), .SZ (Shenzhen)
_SYMBOL_REMAP = {
    ".SH": ".SHH",
    ".SZ": ".SHZ",
}

@register
class DataLoader:
    """Alpha Vantage-backed OHLCV loader."""

    name = "alphavantage"
    markets = {"a_share", "us_equity", "hk_equity", "forex", "macro"}
    requires_auth = True

    def is_available(self) -> bool:
        """Available when ALPHAVANTAGE_API_KEY is set."""
        return bool(os.getenv("ALPHAVANTAGE_API_KEY", ""))

    def __init__(self) -> None:
        self.api_key = os.getenv("ALPHAVANTAGE_API_KEY", "")
        self.base_url = "https://www.alphavantage.co/query"

    def fetch(
        self,
        codes: List[str],
        start_date: str,
        end_date: str,
        *,
        interval: str = "1D",
        fields: Optional[List[str]] = None,
    ) -> Dict[str, pd.DataFrame]:
        """Fetch OHLCV data via Alpha Vantage.

        Args:
            codes: Symbol list (e.g. 000001.SZ, AAPL.US).
            start_date: YYYY-MM-DD.
            end_date: YYYY-MM-DD.
            interval: Bar size (only 1D supported in this basic version).
            fields: Ignored.

        Returns:
            Mapping symbol -> OHLCV DataFrame.
        """
        if interval != "1D":
            logger.warning("alphavantage loader currently only supports 1D interval.")

        result: Dict[str, pd.DataFrame] = {}
        for code in codes:
            try:
                df = self._fetch_one(code, start_date, end_date)
                if df is not None and not df.empty:
                    result[code] = df
            except Exception as exc:
                logger.warning("alphavantage failed for %s: %s", code, exc)
        return result

    def _fetch_one(self, code: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """Fetch a single symbol using TIME_SERIES_DAILY_ADJUSTED."""
        symbol = self._to_av_symbol(code)
        params = {
            "function": "TIME_SERIES_DAILY_ADJUSTED",
            "symbol": symbol,
            "outputsize": "full",
            "apikey": self.api_key,
            "datatype": "json"
        }
        
        response = requests.get(self.base_url, params=params)
        data = response.json()

        # Handle API errors or rate limits
        if "Time Series (Daily)" not in data:
            note = data.get("Note", data.get("Error Message", "Unknown error"))
            logger.error("Alpha Vantage error for %s: %s", symbol, note)
            return None

        daily_data = data["Time Series (Daily)"]
        df = pd.DataFrame.from_dict(daily_data, orient="index")
        
        # Alpha Vantage columns: 1. open, 2. high, 3. low, 4. close, 5. adjusted close, 6. volume...
        df.index = pd.to_datetime(df.index)
        df.index.name = "trade_date"
        
        # Rename columns to standard schema
        rename_map = {
            "1. open": "open",
            "2. high": "high",
            "3. low": "low",
            "5. adjusted close": "close",  # Use adjusted close
            "6. volume": "volume"
        }
        df = df.rename(columns=rename_map)
        
        # Cast to numeric
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Filter by date range
        df = df.sort_index()
        df = df.loc[start_date:end_date]
        
        return df[["open", "high", "low", "close", "volume"]].dropna()

    def _to_av_symbol(self, code: str) -> str:
        """Convert project symbol to Alpha Vantage format."""
        upper = code.upper()
        # Handle China A-shares
        for src, dst in _SYMBOL_REMAP.items():
            if upper.endswith(src):
                return upper.replace(src, dst)
        
        # Handle US
        if upper.endswith(".US"):
            return upper.replace(".US", "")
        
        # Handle HK
        if upper.endswith(".HK"):
            symbol = upper.replace(".HK", "")
            return f"{symbol}.HKG" # Alpha Vantage uses .HKG for Hong Kong
            
        return upper
