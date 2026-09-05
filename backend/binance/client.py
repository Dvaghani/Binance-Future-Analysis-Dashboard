"""
Read-Only Binance Futures REST API Client.
STRICTLY READ-ONLY: No order execution, modification, or withdrawal endpoints exist.
"""
import hmac
import hashlib
import time
import urllib.parse
import httpx
from typing import Dict, Any, List, Optional

class BinanceFuturesClient:
    BASE_URL = "https://fapi.binance.com"

    def __init__(self, api_key: str, api_secret: str):
        # Clean potential whitespace or accidental copy-paste quotes
        self.api_key = (api_key or "").strip().strip('"').strip("'")
        self.api_secret = (api_secret or "").strip().strip('"').strip("'")
        if not self.api_key or not self.api_secret:
            raise ValueError("Binance API Key and API Secret must not be empty.")
        self.time_offset = 0  # difference between local time and server time
        self._sync_time()

    def _sync_time(self):
        """Synchronize local time with Binance server time to avoid timestamp skew."""
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{self.BASE_URL}/fapi/v1/time")
                if res.status_code == 200:
                    server_time = res.json().get("serverTime", int(time.time() * 1000))
                    local_time = int(time.time() * 1000)
                    self.time_offset = server_time - local_time
        except Exception:
            self.time_offset = 0

    def _sign(self, query_string: str) -> str:
        """Sign exact raw query string with HMAC-SHA256."""
        return hmac.new(
            self.api_secret.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    def _request(self, method: str, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send authenticated GET request to Binance Futures API."""
        if method.upper() != "GET":
            raise ValueError("Only GET requests are permitted in read-only mode")

        req_params: Dict[str, Any] = dict(params or {})

        # Add timestamp synchronized with Binance server time
        current_time = int(time.time() * 1000) + self.time_offset
        req_params["timestamp"] = current_time
        req_params["recvWindow"] = 10000

        # Encode query string EXACTLY as sent over the wire
        query_string = urllib.parse.urlencode(req_params)

        # Generate HMAC-SHA256 signature on the exact query_string
        signature = self._sign(query_string)

        full_url = f"{self.BASE_URL}{path}?{query_string}&signature={signature}"

        headers = {
            "X-MBX-APIKEY": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }

        with httpx.Client(timeout=15.0) as client:
            response = client.get(full_url, headers=headers)

            if response.status_code != 200:
                try:
                    err = response.json()
                    msg = err.get("msg", response.text)
                    code = err.get("code", response.status_code)
                    raise RuntimeError(f"Binance API error [{code}]: {msg}")
                except Exception as e:
                    if isinstance(e, RuntimeError):
                        raise e
                    raise RuntimeError(f"HTTP {response.status_code}: {response.text}")

            return response.json()

    def test_connection(self) -> Dict[str, Any]:
        """
        Verify API Key and permissions using GET /fapi/v2/account.
        Throws error if invalid or connection fails.
        """
        data = self._request("GET", "/fapi/v2/account")
        wallet_balance = float(data.get("totalWalletBalance", 0.0))
        unrealized = float(data.get("totalUnrealizedProfit", 0.0))
        margin_balance = float(data.get("totalMarginBalance", wallet_balance + unrealized))
        return {
            "canTrade": data.get("canTrade", False),
            "totalWalletBalance": wallet_balance,
            "totalUnrealizedProfit": unrealized,
            "totalMarginBalance": margin_balance,
            "availableBalance": float(data.get("availableBalance", 0.0)),
            "positions_count": len(data.get("positions", [])),
            "status": "connected"
        }

    def get_account_balance(self) -> List[Dict[str, Any]]:
        """Fetch futures wallet balances."""
        return self._request("GET", "/fapi/v2/balance")

    def get_user_trades(
        self,
        symbol: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 1000,
        from_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Fetch historical user trade executions (fills)."""
        params: Dict[str, Any] = {"symbol": symbol, "limit": limit}
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time
        if from_id:
            params["fromId"] = from_id

        return self._request("GET", "/fapi/v1/userTrades", params)

    def get_income_history(
        self,
        symbol: Optional[str] = None,
        income_type: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Fetch income history including funding fees, commissions, and realized PnL.
        income_type can be: 'FUNDING_FEE', 'COMMISSION', 'REALIZED_PNL'
        """
        params: Dict[str, Any] = {"limit": limit}
        if symbol:
            params["symbol"] = symbol
        if income_type:
            params["incomeType"] = income_type
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time

        return self._request("GET", "/fapi/v1/income", params)

    def get_exchange_symbols(self) -> List[str]:
        """Fetch list of actively traded USDT perpetual contract symbols."""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.BASE_URL}/fapi/v1/exchangeInfo")
                if res.status_code == 200:
                    symbols = [
                        s["symbol"] for s in res.json().get("symbols", [])
                        if s.get("quoteAsset") == "USDT" and s.get("status") == "TRADING"
                    ]
                    return symbols
        except Exception:
            pass
        return ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"]
