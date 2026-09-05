"""
Chart Engine for Trade Price Action Visualization.
Provides candlestick data for closed trades with entry/exit anchoring,
supporting both real Binance Futures klines and authentic simulated replay.
"""
import hashlib
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import httpx

from backend.database.models import Trade

INTERVAL_SECONDS: Dict[str, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
}

def choose_optimal_interval(duration_seconds: int) -> str:
    """Select the most visually informative candlestick timeframe based on trade duration."""
    if duration_seconds <= 1800:       # <= 30 mins -> 1m
        return "1m"
    elif duration_seconds <= 7200:     # <= 2 hours -> 5m
        return "5m"
    elif duration_seconds <= 28800:    # <= 8 hours -> 15m
        return "15m"
    elif duration_seconds <= 86400:    # <= 24 hours -> 30m or 1h
        return "1h"
    else:                              # > 1 day -> 4h
        return "4h"

def fetch_binance_klines(
    symbol: str,
    interval: str,
    start_time: datetime,
    end_time: datetime
) -> Optional[List[Dict[str, Any]]]:
    """
    Attempt to fetch historical public klines from Binance Futures REST API.
    Returns None if unreachable, rate limited, or empty.
    """
    try:
        start_ms = int(start_time.replace(tzinfo=timezone.utc).timestamp() * 1000)
        end_ms = int(end_time.replace(tzinfo=timezone.utc).timestamp() * 1000)

        url = "https://fapi.binance.com/fapi/v1/klines"
        params = {
            "symbol": symbol,
            "interval": interval,
            "startTime": start_ms,
            "endTime": end_ms,
            "limit": 400
        }

        with httpx.Client(timeout=4.0) as client:
            res = client.get(url, params=params)
            if res.status_code == 200:
                raw_data = res.json()
                if not raw_data or not isinstance(raw_data, list) or len(raw_data) < 3:
                    return None

                candles: List[Dict[str, Any]] = []
                for k in raw_data:
                    open_time_ms = int(k[0])
                    dt = datetime.fromtimestamp(open_time_ms / 1000, tz=timezone.utc)
                    candles.append({
                        "time": int(open_time_ms / 1000),
                        "time_str": dt.strftime("%H:%M" if interval in ("1m", "5m", "15m", "30m") else "%m-%d %H:%M"),
                        "date_str": dt.strftime("%Y-%m-%d"),
                        "open": round(float(k[1]), 4 if float(k[1]) < 10 else 2),
                        "high": round(float(k[2]), 4 if float(k[2]) < 10 else 2),
                        "low": round(float(k[3]), 4 if float(k[3]) < 10 else 2),
                        "close": round(float(k[4]), 4 if float(k[4]) < 10 else 2),
                        "volume": round(float(k[5]), 2)
                    })
                return candles
    except Exception:
        return None
    return None

def generate_simulated_candles(
    trade: Trade,
    interval: str,
    pad_candles: int = 16
) -> Dict[str, Any]:
    """
    Deterministically generate high-fidelity candlestick price action anchored
    strictly to the trade's entry_price, exit_price, entry_time, exit_time, and outcome.
    """
    # Deterministic RNG keyed by trade ID and interval
    seed_int = int(hashlib.md5(f"{trade.id}_{interval}".encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed_int)

    sec_per_bar = INTERVAL_SECONDS.get(interval, 900)
    trade_duration = max(sec_per_bar, trade.duration_seconds)
    trade_bars_count = max(3, int(trade_duration / sec_per_bar))

    # Base price scale
    base_price = trade.entry_price
    price_decimals = 4 if base_price < 10 else 2
    is_long = trade.side.upper() == "LONG"
    is_win = trade.net_pnl > 0

    entry_dt = trade.entry_time
    exit_dt = trade.exit_time

    candles: List[Dict[str, Any]] = []

    # Volatility per candle based on asset price
    volatility = base_price * (0.0018 if interval == "1m" else 0.0035 if interval == "5m" else 0.006)

    # 1. Pre-trade candles (trending or fluctuating into entry)
    pre_open = base_price - (rng.uniform(-2, 2) * volatility * (pad_candles / 3))
    current_price = pre_open

    for i in range(pad_candles):
        bar_dt = entry_dt - timedelta(seconds=(pad_candles - i) * sec_per_bar)
        step_to_entry = (trade.entry_price - current_price) / max(1, (pad_candles - i))
        jitter = rng.uniform(-volatility, volatility)
        
        b_open = current_price
        b_close = current_price + step_to_entry + jitter
        
        # Keep entry candle opening or closing very close to entry
        if i == pad_candles - 1:
            b_close = trade.entry_price

        b_high = max(b_open, b_close) + abs(rng.uniform(0.1, 1.2) * volatility)
        b_low = min(b_open, b_close) - abs(rng.uniform(0.1, 1.2) * volatility)
        b_vol = round(rng.uniform(15.0, 80.0) * (base_price / 1000.0), 2)

        candles.append({
            "time": int(bar_dt.replace(tzinfo=timezone.utc).timestamp()),
            "time_str": bar_dt.strftime("%H:%M" if interval in ("1m", "5m", "15m", "30m") else "%m-%d %H:%M"),
            "date_str": bar_dt.strftime("%Y-%m-%d"),
            "open": round(b_open, price_decimals),
            "high": round(b_high, price_decimals),
            "low": round(b_low, price_decimals),
            "close": round(b_close, price_decimals),
            "volume": b_vol
        })
        current_price = b_close

    # 2. In-trade candles (from entry to exit)
    entry_index = len(candles)
    current_price = trade.entry_price

    # Compute a realistic trajectory between entry and exit
    mfe_peak_ratio = rng.uniform(0.35, 0.70)
    mfe_bar_idx = int(trade_bars_count * mfe_peak_ratio)

    # Max excursion beyond entry/exit
    delta_price = trade.exit_price - trade.entry_price
    if is_win:
        peak_excursion = (trade.exit_price + abs(delta_price) * rng.uniform(0.15, 0.45)) if is_long else (trade.exit_price - abs(delta_price) * rng.uniform(0.15, 0.45))
    else:
        peak_excursion = (trade.entry_price - abs(delta_price) * rng.uniform(0.2, 0.5)) if is_long else (trade.entry_price + abs(delta_price) * rng.uniform(0.2, 0.5))

    for i in range(trade_bars_count):
        bar_dt = entry_dt + timedelta(seconds=i * sec_per_bar)
        
        # Target progression
        if i == trade_bars_count - 1:
            b_open = current_price
            b_close = trade.exit_price
        elif i <= mfe_bar_idx:
            # Moving towards peak excursion
            progress = (i + 1) / max(1, mfe_bar_idx + 1)
            target = trade.entry_price + (peak_excursion - trade.entry_price) * progress
            noise = rng.uniform(-volatility * 0.7, volatility * 0.7)
            b_open = current_price
            b_close = target + noise
        else:
            # Moving from peak towards exit
            progress = (i - mfe_bar_idx) / max(1, (trade_bars_count - 1 - mfe_bar_idx))
            target = peak_excursion + (trade.exit_price - peak_excursion) * progress
            noise = rng.uniform(-volatility * 0.7, volatility * 0.7)
            b_open = current_price
            b_close = target + noise

        b_high = max(b_open, b_close) + abs(rng.uniform(0.2, 1.4) * volatility)
        b_low = min(b_open, b_close) - abs(rng.uniform(0.2, 1.4) * volatility)
        
        # Volume surges
        vol_mult = 2.5 if i == 0 or i == trade_bars_count - 1 else 1.0
        b_vol = round(rng.uniform(30.0, 140.0) * vol_mult * (base_price / 1000.0), 2)

        candles.append({
            "time": int(bar_dt.replace(tzinfo=timezone.utc).timestamp()),
            "time_str": bar_dt.strftime("%H:%M" if interval in ("1m", "5m", "15m", "30m") else "%m-%d %H:%M"),
            "date_str": bar_dt.strftime("%Y-%m-%d"),
            "open": round(b_open, price_decimals),
            "high": round(b_high, price_decimals),
            "low": round(b_low, price_decimals),
            "close": round(b_close, price_decimals),
            "volume": b_vol
        })
        current_price = b_close

    exit_index = len(candles) - 1

    # 3. Post-trade candles (market continues after trade close)
    current_price = trade.exit_price
    for i in range(pad_candles):
        bar_dt = exit_dt + timedelta(seconds=(i + 1) * sec_per_bar)
        noise = rng.uniform(-volatility * 1.1, volatility * 1.1)
        b_open = current_price
        b_close = current_price + noise
        b_high = max(b_open, b_close) + abs(rng.uniform(0.1, 1.2) * volatility)
        b_low = min(b_open, b_close) - abs(rng.uniform(0.1, 1.2) * volatility)
        b_vol = round(rng.uniform(15.0, 75.0) * (base_price / 1000.0), 2)

        candles.append({
            "time": int(bar_dt.replace(tzinfo=timezone.utc).timestamp()),
            "time_str": bar_dt.strftime("%H:%M" if interval in ("1m", "5m", "15m", "30m") else "%m-%d %H:%M"),
            "date_str": bar_dt.strftime("%Y-%m-%d"),
            "open": round(b_open, price_decimals),
            "high": round(b_high, price_decimals),
            "low": round(b_low, price_decimals),
            "close": round(b_close, price_decimals),
            "volume": b_vol
        })
        current_price = b_close

    return {
        "candles": candles,
        "entry_index": entry_index,
        "exit_index": exit_index,
        "source": "simulated"
    }

def get_trade_chart_data(trade: Trade, requested_interval: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entrypoint: retrieves candlestick chart data and trade execution markers.
    Tries Binance public API for live trades, falls back seamlessly to simulated candles.
    """
    interval = requested_interval if requested_interval in INTERVAL_SECONDS else choose_optimal_interval(trade.duration_seconds)
    sec_per_bar = INTERVAL_SECONDS.get(interval, 900)

    pad_count = 18
    pad_duration = timedelta(seconds=pad_count * sec_per_bar)
    start_time = trade.entry_time - pad_duration
    end_time = trade.exit_time + pad_duration

    candles: Optional[List[Dict[str, Any]]] = None
    source = "simulated"

    # Only attempt live exchange fetch if not demo
    if not trade.is_demo:
        binance_candles = fetch_binance_klines(trade.symbol, interval, start_time, end_time)
        if binance_candles and len(binance_candles) >= 5:
            # Check price sanity (within 35% of trade entry price)
            first_close = binance_candles[0]["close"]
            if abs(first_close - trade.entry_price) / trade.entry_price < 0.35:
                candles = binance_candles
                source = "binance"

    if not candles:
        sim_res = generate_simulated_candles(trade, interval, pad_candles=pad_count)
        candles = sim_res["candles"]
        entry_idx = sim_res["entry_index"]
        exit_idx = sim_res["exit_index"]
        source = "simulated"
    else:
        # Locate closest candle index to entry_time and exit_time
        entry_ts = int(trade.entry_time.replace(tzinfo=timezone.utc).timestamp())
        exit_ts = int(trade.exit_time.replace(tzinfo=timezone.utc).timestamp())
        
        entry_idx = 0
        min_entry_diff = float("inf")
        exit_idx = len(candles) - 1
        min_exit_diff = float("inf")

        for idx, c in enumerate(candles):
            diff_entry = abs(c["time"] - entry_ts)
            if diff_entry < min_entry_diff:
                min_entry_diff = diff_entry
                entry_idx = idx
            diff_exit = abs(c["time"] - exit_ts)
            if diff_exit < min_exit_diff:
                min_exit_diff = diff_exit
                exit_idx = idx

        if exit_idx <= entry_idx:
            exit_idx = min(len(candles) - 1, entry_idx + 1)

    # Compute high/low bounds and excursion metrics
    all_highs = [c["high"] for c in candles] + [trade.entry_price, trade.exit_price]
    all_lows = [c["low"] for c in candles] + [trade.entry_price, trade.exit_price]
    
    trade_candles = candles[entry_idx : exit_idx + 1] if exit_idx >= entry_idx else candles
    trade_high = max([c["high"] for c in trade_candles]) if trade_candles else trade.entry_price
    trade_low = min([c["low"] for c in trade_candles]) if trade_candles else trade.entry_price

    is_long = trade.side.upper() == "LONG"
    mfe = trade_high if is_long else trade_low
    mae = trade_low if is_long else trade_high

    # Format behavioral flags list
    flags = [f.strip() for f in (trade.behavioral_flags or "").split(",") if f.strip()]

    return {
        "trade": {
            "id": trade.id,
            "symbol": trade.symbol,
            "side": trade.side,
            "entry_time": trade.entry_time.strftime("%Y-%m-%d %H:%M"),
            "exit_time": trade.exit_time.strftime("%Y-%m-%d %H:%M"),
            "entry_price": trade.entry_price,
            "exit_price": trade.exit_price,
            "quantity": trade.quantity,
            "position_value": trade.position_value,
            "leverage": trade.leverage,
            "gross_pnl": trade.gross_pnl,
            "net_pnl": trade.net_pnl,
            "pnl_percentage": trade.pnl_percentage,
            "commission": round(trade.commission, 4) if trade.commission else 0.0,
            "funding_fees": round(trade.funding_fees, 4) if trade.funding_fees else 0.0,
            "duration_seconds": trade.duration_seconds,
            "duration_formatted": f"{trade.duration_seconds // 3600}h {(trade.duration_seconds % 3600) // 60}m" if trade.duration_seconds >= 3600 else f"{trade.duration_seconds // 60}m",
            "is_winner": trade.is_winner,
            "behavioral_flags": flags,
            "market_regime": trade.market_regime,
            "notes": trade.notes
        },
        "candles": candles,
        "entry_index": entry_idx,
        "exit_index": exit_idx,
        "interval": interval,
        "source": source,
        "min_price": min(all_lows),
        "max_price": max(all_highs),
        "mfe": mfe,
        "mae": mae
    }
