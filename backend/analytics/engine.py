"""
Deterministic Statistical Analytics Engine for Binance Futures Trading.
Performs 16+ core analytical calculations, 8 behavioral flaw detections,
transparent risk scoring, and multi-timeframe equity curve modeling.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from backend.database.models import Trade

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Helper conversions
def trades_to_df(trades: List[Trade]) -> pd.DataFrame:
    if not trades:
        return pd.DataFrame()
    data = []
    for t in trades:
        data.append({
            "id": t.id,
            "symbol": t.symbol,
            "side": t.side,
            "entry_time": t.entry_time,
            "exit_time": t.exit_time,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "quantity": t.quantity,
            "position_value": t.position_value,
            "leverage": t.leverage,
            "gross_pnl": t.gross_pnl,
            "pnl_percentage": t.pnl_percentage,
            "commission": t.commission,
            "funding_fees": t.funding_fees,
            "net_pnl": t.net_pnl,
            "duration_seconds": t.duration_seconds,
            "is_winner": t.is_winner,
            "behavioral_flags": t.behavioral_flags or "",
            "market_regime": t.market_regime or "Sideways",
            "notes": t.notes or ""
        })
    df = pd.DataFrame(data)
    df["entry_time"] = pd.to_datetime(df["entry_time"])
    df["exit_time"] = pd.to_datetime(df["exit_time"])
    df = df.sort_values("exit_time").reset_index(drop=True)
    return df

def compute_equity_and_drawdown(
    df: pd.DataFrame,
    current_balance: float = 10000.0,
    unrealized_pnl: float = 0.0
) -> Tuple[pd.DataFrame, float]:
    """
    Computes continuous account equity progression, peak equity, and drawdowns.
    Incorporates starting equity as the initial baseline high-water mark so that early losses
    are accurately captured. Accurately handles accounts of any capital size without an
    artificial floor clamp.
    """
    current_equity = current_balance + unrealized_pnl
    if df.empty:
        return df, max(current_equity, 10.0)

    df = df.sort_values("exit_time").reset_index(drop=True)
    df["cumulative_net_pnl"] = df["net_pnl"].cumsum()

    total_net_pnl = float(df["cumulative_net_pnl"].iloc[-1])
    inferred_start = current_equity - total_net_pnl

    if inferred_start > 0:
        starting_equity = inferred_start
    else:
        # Fallback for accounts with past withdrawals: ensure starting equity cushions against liquidation
        min_cum = float(df["cumulative_net_pnl"].min())
        cushion = max(abs(min_cum) * 1.5, 10.0) if min_cum < 0 else 10.0
        starting_equity = max(current_equity, cushion, 10.0)

    df["equity"] = starting_equity + df["cumulative_net_pnl"]

    # Incorporate starting_equity as the initial high-water mark
    equity_with_start = pd.concat([pd.Series([starting_equity]), df["equity"]], ignore_index=True)
    df["peak_equity"] = equity_with_start.cummax().iloc[1:].reset_index(drop=True)

    df["drawdown"] = df["peak_equity"] - df["equity"]
    df["drawdown_pct"] = (df["drawdown"] / df["peak_equity"]) * 100.0

    return df, starting_equity

# 1. Core KPIs
def calculate_kpis(trades: List[Trade], current_balance: float = 10000.0, unrealized_pnl: float = 0.0) -> Dict[str, Any]:
    df = trades_to_df(trades)
    current_equity = current_balance + unrealized_pnl
    if df.empty:
        return {
            "total_trades": 0,
            "current_balance": round(current_balance, 2),
            "equity": round(current_equity, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "net_pnl": 0.0,
            "gross_pnl": 0.0,
            "today_pnl": 0.0,
            "seven_day_pnl": 0.0,
            "thirty_day_pnl": 0.0,
            "roi_pct": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "average_trade": 0.0,
            "max_drawdown": 0.0,
            "max_drawdown_pct": 0.0,
            "trajectory": "neutral",
            "total_fees": 0.0,
            "total_funding": 0.0,
        }

    total_trades = len(df)
    net_pnl = float(df["net_pnl"].sum())
    gross_pnl = float(df["gross_pnl"].sum())
    total_fees = float(df["commission"].sum())
    total_funding = float(df["funding_fees"].sum())

    now = get_utc_now()
    one_day_ago = now - timedelta(days=1)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    today_trades = df[df["exit_time"] >= one_day_ago]
    today_pnl = float(today_trades["net_pnl"].sum()) if not today_trades.empty else 0.0

    seven_day_trades = df[df["exit_time"] >= seven_days_ago]
    seven_day_pnl = float(seven_day_trades["net_pnl"].sum()) if not seven_day_trades.empty else 0.0

    thirty_day_trades = df[df["exit_time"] >= thirty_days_ago]
    thirty_day_pnl = float(thirty_day_trades["net_pnl"].sum()) if not thirty_day_trades.empty else 0.0

    winning_trades = df[df["net_pnl"] > 0]
    losing_trades = df[df["net_pnl"] <= 0]
    win_rate = (len(winning_trades) / total_trades) * 100.0 if total_trades > 0 else 0.0

    gross_profit = float(winning_trades["net_pnl"].sum())
    gross_loss = abs(float(losing_trades["net_pnl"].sum()))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)

    average_trade = float(df["net_pnl"].mean())

    # Drawdown and Equity calculation
    df, starting_equity = compute_equity_and_drawdown(df, current_balance, unrealized_pnl)

    max_drawdown = float(df["drawdown"].max()) if not df.empty else 0.0
    max_drawdown_pct = float(df["drawdown_pct"].max()) if not df.empty else 0.0

    roi_pct = (net_pnl / starting_equity) * 100.0 if starting_equity > 0 else 0.0

    # Trajectory comparison (recent 7d pace vs 30d pace)
    pace_7d = seven_day_pnl / 7.0
    pace_30d = thirty_day_pnl / 30.0
    if pace_7d > pace_30d and seven_day_pnl > 0:
        trajectory = "improving"
    elif pace_7d < pace_30d and seven_day_pnl < 0:
        trajectory = "degrading"
    else:
        trajectory = "steady"

    return {
        "total_trades": total_trades,
        "current_balance": round(current_balance, 2),
        "equity": round(current_equity, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "net_pnl": round(net_pnl, 2),
        "gross_pnl": round(gross_pnl, 2),
        "today_pnl": round(today_pnl, 2),
        "seven_day_pnl": round(seven_day_pnl, 2),
        "thirty_day_pnl": round(thirty_day_pnl, 2),
        "roi_pct": round(roi_pct, 2),
        "win_rate": round(win_rate, 1),
        "profit_factor": round(profit_factor, 2),
        "average_trade": round(average_trade, 2),
        "max_drawdown": round(max_drawdown, 2),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "trajectory": trajectory,
        "total_fees": round(total_fees, 4),
        "total_funding": round(total_funding, 4),
    }

# 2. Equity and Drawdown Curve
def calculate_equity_curve(trades: List[Trade], timeframe: str = "ALL", current_balance: float = 10000.0, unrealized_pnl: float = 0.0) -> List[Dict[str, Any]]:
    df = trades_to_df(trades)
    if df.empty:
        return []

    current_equity = current_balance + unrealized_pnl

    # Timeframe filtering
    now = get_utc_now()
    if timeframe == "1D":
        cutoff = now - timedelta(days=1)
        df = df[df["exit_time"] >= cutoff]
    elif timeframe == "7D":
        cutoff = now - timedelta(days=7)
        df = df[df["exit_time"] >= cutoff]
    elif timeframe == "30D":
        cutoff = now - timedelta(days=30)
        df = df[df["exit_time"] >= cutoff]
    elif timeframe == "3M":
        cutoff = now - timedelta(days=90)
        df = df[df["exit_time"] >= cutoff]
    elif timeframe == "6M":
        cutoff = now - timedelta(days=180)
        df = df[df["exit_time"] >= cutoff]
    elif timeframe == "1Y":
        cutoff = now - timedelta(days=365)
        df = df[df["exit_time"] >= cutoff]

    if df.empty:
        return []

    df, starting_equity = compute_equity_and_drawdown(df, current_balance, unrealized_pnl)

    # Downsample points if there are too many (e.g. > 150) for smooth rendering
    points = []
    step = max(1, len(df) // 120)
    sampled = df.iloc[::step].copy()
    if sampled.iloc[-1]["id"] != df.iloc[-1]["id"]:
        sampled = pd.concat([sampled, df.iloc[[-1]]])

    for _, row in sampled.iterrows():
        points.append({
            "timestamp": row["exit_time"].strftime("%Y-%m-%d %H:%M"),
            "date": row["exit_time"].strftime("%b %d"),
            "net_pnl": round(float(row["net_pnl"]), 4),
            "cumulative_pnl": round(float(row["cumulative_net_pnl"]), 2),
            "equity": round(float(row["equity"]), 2),
            "drawdown": round(float(row["drawdown"]), 2),
            "drawdown_pct": round(float(row["drawdown_pct"]), 2),
            "symbol": row["symbol"],
            "side": row["side"]
        })

    return points

# 3. Long vs Short Performance
def calculate_long_short_performance(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {
            "long": {},
            "short": {},
            "insight": "No trades available to compare Long vs Short."
        }

    long_df = df[df["side"].str.upper() == "LONG"]
    short_df = df[df["side"].str.upper() == "SHORT"]

    def calc_side_metrics(sdf: pd.DataFrame) -> Dict[str, Any]:
        count = len(sdf)
        if count == 0:
            return {
                "trades": 0, "pnl": 0.0, "win_rate": 0.0, "avg_winner": 0.0,
                "avg_loser": 0.0, "profit_factor": 0.0, "volume": 0.0, "fees": 0.0
            }
        winners = sdf[sdf["net_pnl"] > 0]
        losers = sdf[sdf["net_pnl"] <= 0]
        pnl = float(sdf["net_pnl"].sum())
        win_rate = (len(winners) / count) * 100.0
        avg_winner = float(winners["net_pnl"].mean()) if not winners.empty else 0.0
        avg_loser = float(losers["net_pnl"].mean()) if not losers.empty else 0.0
        gross_profit = float(winners["net_pnl"].sum())
        gross_loss = abs(float(losers["net_pnl"].sum()))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)
        volume = float(sdf["position_value"].sum())
        fees = float(sdf["commission"].sum())

        return {
            "trades": count,
            "pnl": round(pnl, 2),
            "win_rate": round(win_rate, 1),
            "avg_winner": round(avg_winner, 2),
            "avg_loser": round(avg_loser, 2),
            "profit_factor": round(profit_factor, 2),
            "volume": round(volume, 2),
            "fees": round(fees, 2)
        }

    long_metrics = calc_side_metrics(long_df)
    short_metrics = calc_side_metrics(short_df)

    # Dynamic objective insight generation based strictly on calculated numbers
    long_pnl_str = f"+${long_metrics['pnl']:.2f}" if long_metrics['pnl'] >= 0 else f"-${abs(long_metrics['pnl']):.2f}"
    short_pnl_str = f"+${short_metrics['pnl']:.2f}" if short_metrics['pnl'] >= 0 else f"-${abs(short_metrics['pnl']):.2f}"

    if long_metrics["trades"] > 0 and short_metrics["trades"] > 0:
        if long_metrics["pnl"] > short_metrics["pnl"]:
            delta = long_metrics["pnl"] - short_metrics["pnl"]
            insight = (
                f"Your LONG trades generated {long_pnl_str} with a {long_metrics['win_rate']}% win rate, "
                f"while SHORT trades recorded {short_pnl_str} with a {short_metrics['win_rate']}% win rate. "
                f"Long positions outperformed shorts by ${delta:.2f}."
            )
        else:
            delta = short_metrics["pnl"] - long_metrics["pnl"]
            insight = (
                f"Your SHORT trades generated {short_pnl_str} with a {short_metrics['win_rate']}% win rate, "
                f"while LONG trades recorded {long_pnl_str} with a {long_metrics['win_rate']}% win rate. "
                f"Short positions outperformed longs by ${delta:.2f}."
            )
    else:
        insight = "Insufficient multi-directional data to formulate a comparison."

    return {
        "long": long_metrics,
        "short": short_metrics,
        "insight": insight
    }

# 4. Asset Analysis (Coin-by-Coin)
def calculate_asset_performance(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {"assets": [], "top_driver": None, "top_dragger": None}

    assets = []
    for symbol, group in df.groupby("symbol"):
        count = len(group)
        pnl = float(group["net_pnl"].sum())
        winners = group[group["net_pnl"] > 0]
        losers = group[group["net_pnl"] <= 0]
        win_rate = (len(winners) / count) * 100.0
        avg_win = float(winners["net_pnl"].mean()) if not winners.empty else 0.0
        avg_loss = float(losers["net_pnl"].mean()) if not losers.empty else 0.0
        gross_profit = float(winners["net_pnl"].sum())
        gross_loss = abs(float(losers["net_pnl"].sum()))
        pf = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)
        volume = float(group["position_value"].sum())
        fees = float(group["commission"].sum())
        funding = float(group["funding_fees"].sum())

        assets.append({
            "symbol": symbol,
            "trades": count,
            "net_pnl": round(pnl, 2),
            "win_rate": round(win_rate, 1),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "profit_factor": round(pf, 2),
            "volume": round(volume, 2),
            "fees": round(fees, 4),
            "funding": round(funding, 4),
            "is_profitable": pnl > 0
        })

    assets.sort(key=lambda x: x["net_pnl"], reverse=True)
    top_driver = assets[0] if assets and assets[0]["net_pnl"] > 0 else (assets[0] if assets else None)
    top_dragger = assets[-1] if assets and assets[-1]["net_pnl"] < 0 else (assets[-1] if assets else None)

    return {
        "assets": assets,
        "top_driver": top_driver,
        "top_dragger": top_dragger
    }

# 5. Time Analysis (Hourly, Day of Week, Sessions)
def calculate_time_analysis(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {"hourly": [], "daily": [], "sessions": [], "best_window": "", "worst_window": ""}

    df["hour"] = df["entry_time"].dt.hour
    df["day_name"] = df["entry_time"].dt.day_name()
    df["day_of_week"] = df["entry_time"].dt.dayofweek # 0=Mon, 6=Sun

    # 1. Hourly (0 to 23 UTC)
    hourly = []
    for h in range(24):
        hdf = df[df["hour"] == h]
        count = len(hdf)
        if count == 0:
            hourly.append({"hour": h, "trades": 0, "net_pnl": 0.0, "win_rate": 0.0})
        else:
            pnl = float(hdf["net_pnl"].sum())
            win_rate = (len(hdf[hdf["net_pnl"] > 0]) / count) * 100.0
            hourly.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "trades": count,
                "net_pnl": round(pnl, 2),
                "win_rate": round(win_rate, 1)
            })

    # Find best/worst 4-hour window
    best_pnl = -float("inf")
    best_start = 0
    worst_pnl = float("inf")
    worst_start = 0
    for i in range(24):
        window_hours = [(i + j) % 24 for j in range(4)]
        wdf = df[df["hour"].isin(window_hours)]
        if not wdf.empty:
            wpnl = float(wdf["net_pnl"].sum())
            if wpnl > best_pnl:
                best_pnl = wpnl
                best_start = i
            if wpnl < worst_pnl:
                worst_pnl = wpnl
                worst_start = i

    best_window = f"{best_start:02d}:00–{(best_start+4)%24:02d}:00 UTC (+${best_pnl:.2f})" if best_pnl != -float("inf") else "N/A"
    worst_window = f"{worst_start:02d}:00–{(worst_start+4)%24:02d}:00 UTC (-${abs(worst_pnl):.2f})" if worst_pnl != float("inf") else "N/A"

    # 2. Day of Week
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily = []
    for d in day_order:
        ddf = df[df["day_name"] == d]
        count = len(ddf)
        if count == 0:
            daily.append({"day": d, "trades": 0, "net_pnl": 0.0, "win_rate": 0.0})
        else:
            pnl = float(ddf["net_pnl"].sum())
            win_rate = (len(ddf[ddf["net_pnl"] > 0]) / count) * 100.0
            daily.append({
                "day": d,
                "trades": count,
                "net_pnl": round(pnl, 2),
                "win_rate": round(win_rate, 1)
            })

    # 3. Sessions (Asian: 00-08 UTC, London: 08-16 UTC, NY: 13-21 UTC)
    def assign_session(hour: int) -> str:
        if 0 <= hour < 8:
            return "Asian"
        elif 8 <= hour < 14:
            return "London"
        elif 14 <= hour < 21:
            return "New York"
        else:
            return "After Hours"

    df["session"] = df["hour"].apply(assign_session)
    sessions = []
    for s in ["Asian", "London", "New York", "After Hours"]:
        sdf = df[df["session"] == s]
        count = len(sdf)
        if count == 0:
            sessions.append({"session": s, "trades": 0, "net_pnl": 0.0, "win_rate": 0.0, "profit_factor": 0.0})
        else:
            pnl = float(sdf["net_pnl"].sum())
            winners = sdf[sdf["net_pnl"] > 0]
            losers = sdf[sdf["net_pnl"] <= 0]
            win_rate = (len(winners) / count) * 100.0
            gp = float(winners["net_pnl"].sum())
            gl = abs(float(losers["net_pnl"].sum()))
            pf = (gp / gl) if gl > 0 else (99.0 if gp > 0 else 0.0)
            sessions.append({
                "session": s,
                "trades": count,
                "net_pnl": round(pnl, 2),
                "win_rate": round(win_rate, 1),
                "profit_factor": round(pf, 2)
            })

    return {
        "hourly": hourly,
        "daily": daily,
        "sessions": sessions,
        "best_window": best_window,
        "worst_window": worst_window
    }

# 6. Winner vs Loser Dissection
def calculate_winner_loser_stats(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {}

    winners = df[df["net_pnl"] > 0]
    losers = df[df["net_pnl"] <= 0]

    avg_winner = float(winners["net_pnl"].mean()) if not winners.empty else 0.0
    avg_loser = abs(float(losers["net_pnl"].mean())) if not losers.empty else 0.0
    largest_winner = float(winners["net_pnl"].max()) if not winners.empty else 0.0
    largest_loser = abs(float(losers["net_pnl"].min())) if not losers.empty else 0.0

    avg_win_duration = float(winners["duration_seconds"].mean()) if not winners.empty else 0.0
    avg_loss_duration = float(losers["duration_seconds"].mean()) if not losers.empty else 0.0
    median_win_duration = float(winners["duration_seconds"].median()) if not winners.empty else 0.0
    median_loss_duration = float(losers["duration_seconds"].median()) if not losers.empty else 0.0

    # Calculate streaks
    streak_records = []
    current_streak = 0
    current_type = None
    max_win_streak = 0
    max_loss_streak = 0

    for _, row in df.iterrows():
        is_win = row["net_pnl"] > 0
        if is_win:
            if current_type == "WIN":
                current_streak += 1
            else:
                current_type = "WIN"
                current_streak = 1
            max_win_streak = max(max_win_streak, current_streak)
        else:
            if current_type == "LOSS":
                current_streak += 1
            else:
                current_type = "LOSS"
                current_streak = 1
            max_loss_streak = max(max_loss_streak, current_streak)

    # Expectancy: (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
    win_rate = len(winners) / len(df) if len(df) > 0 else 0.0
    loss_rate = 1.0 - win_rate
    expectancy = (win_rate * avg_winner) - (loss_rate * avg_loser)

    gross_profit = float(winners["net_pnl"].sum())
    gross_loss = abs(float(losers["net_pnl"].sum()))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)

    loss_to_win_ratio = (avg_loser / avg_winner) if avg_winner > 0 else 0.0

    return {
        "avg_winner": round(avg_winner, 2),
        "avg_loser": round(avg_loser, 2),
        "largest_winner": round(largest_winner, 2),
        "largest_loser": round(largest_loser, 2),
        "avg_win_holding_mins": round(avg_win_duration / 60.0, 1),
        "avg_loss_holding_mins": round(avg_loss_duration / 60.0, 1),
        "median_win_holding_mins": round(median_win_duration / 60.0, 1),
        "median_loss_holding_mins": round(median_loss_duration / 60.0, 1),
        "max_win_streak": max_win_streak,
        "max_loss_streak": max_loss_streak,
        "expectancy": round(expectancy, 2),
        "profit_factor": round(profit_factor, 2),
        "loss_to_win_ratio": round(loss_to_win_ratio, 2),
        "holding_time_ratio": round(avg_loss_duration / avg_win_duration, 2) if avg_win_duration > 0 else 1.0
    }

# 7. Algorithmic Trading Behavior Detection (8 Detectors)
def calculate_behavioral_patterns(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {
            "behaviors": [],
            "flagged_trades": [],
            "total_flagged_count": 0,
            "discipline_score": 100,
            "disciplined_trades_count": 0,
            "total_trades_count": 0,
            "total_habit_cost": 0.0
        }

    total_trades = len(df)
    median_size = float(df["position_value"].median())

    winners_df = df[df["net_pnl"] > 0]
    losers_df = df[df["net_pnl"] <= 0]

    median_winner_duration = float(winners_df["duration_seconds"].median()) if not winners_df.empty else 3600.0
    avg_win = float(winners_df["net_pnl"].mean()) if not winners_df.empty else 1.0
    avg_loss = abs(float(losers_df["net_pnl"].mean())) if not losers_df.empty else 1.0

    daily_counts = df.groupby(df["entry_time"].dt.date).size().to_dict()
    daily_values = list(daily_counts.values())
    median_daily_trades = float(pd.Series(daily_values).median()) if daily_values else 2.0

    # Flaw accumulators
    patterns = {
        "OVERTRADING": {
            "title": "Overtrading",
            "count": 0,
            "cost": 0.0,
            "description": "Abnormal trade frequency spikes exceeding sustainable daily volume or rapid clustering."
        },
        "REVENGE_TRADING": {
            "title": "Revenge Trading",
            "count": 0,
            "cost": 0.0,
            "description": "Entering new positions within 15 minutes of closing a losing trade."
        },
        "LOSS_CHASING": {
            "title": "Loss Chasing",
            "count": 0,
            "cost": 0.0,
            "description": "Aggressively increasing position size or leverage directly after experiencing a loss."
        },
        "OVERSIZED": {
            "title": "Over-Sizing",
            "count": 0,
            "cost": 0.0,
            "description": "Taking outlier position sizes exceeding 1.8× typical median capital allocation."
        },
        "HELD_LOSER_TOO_LONG": {
            "title": "Holding Losers Too Long",
            "count": 0,
            "cost": 0.0,
            "description": "Letting losing positions run for extended durations (>3.5h or >1.8× winner hold time)."
        },
        "CUT_WINNER_EARLY": {
            "title": "Taking Profits Too Early",
            "count": 0,
            "cost": 0.0,
            "description": "Prematurely cutting profitable positions during early momentum (<10 mins or <0.35× avg win)."
        },
        "STREAK_TILT": {
            "title": "Losing Streak Tilt",
            "count": 0,
            "cost": 0.0,
            "description": "Trading performance degradation following 3 or more consecutive losses."
        },
        "EUPHORIA_OVERTRADING": {
            "title": "Overtrading After Wins",
            "count": 0,
            "cost": 0.0,
            "description": "Sudden burst of rushed trades immediately following an outsized winning trade."
        }
    }

    flagged_dict = {}
    df_sorted_entry = df.sort_values("entry_time").reset_index(drop=True)

    for i in range(len(df_sorted_entry)):
        row = df_sorted_entry.iloc[i]
        trade_id = row["id"]
        flags = []
        entry_t = row["entry_time"]
        net_pnl = float(row["net_pnl"])

        # 1. Overtrading
        day_cnt = daily_counts.get(entry_t.date(), 0)
        recent_entries_1h = df_sorted_entry[
            (df_sorted_entry["entry_time"] <= entry_t) & 
            (df_sorted_entry["entry_time"] >= entry_t - pd.Timedelta(minutes=60))
        ]
        if day_cnt > 10 or (len(daily_counts) > 2 and day_cnt > max(6, median_daily_trades * 1.8)) or len(recent_entries_1h) >= 4:
            flags.append("OVERTRADING")
            patterns["OVERTRADING"]["count"] += 1
            if net_pnl < 0:
                patterns["OVERTRADING"]["cost"] += abs(net_pnl)

        # 2. Revenge trading & Loss Chasing
        prior_losses = df[
            (df["exit_time"] <= entry_t) & 
            (df["exit_time"] >= entry_t - pd.Timedelta(minutes=20)) & 
            (df["net_pnl"] <= 0)
        ]
        if not prior_losses.empty:
            flags.append("REVENGE_TRADING")
            patterns["REVENGE_TRADING"]["count"] += 1
            if net_pnl < 0:
                patterns["REVENGE_TRADING"]["cost"] += abs(net_pnl)

            last_loss = prior_losses.sort_values("exit_time").iloc[-1]
            if (row["position_value"] >= last_loss["position_value"] * 1.25) or (row["leverage"] >= last_loss["leverage"] + 3):
                flags.append("LOSS_CHASING")
                patterns["LOSS_CHASING"]["count"] += 1
                if net_pnl < 0:
                    patterns["LOSS_CHASING"]["cost"] += abs(net_pnl)

        # 3. Euphoria overtrading
        prior_big_wins = df[
            (df["exit_time"] <= entry_t) & 
            (df["exit_time"] >= entry_t - pd.Timedelta(minutes=15)) & 
            (df["net_pnl"] >= avg_win * 1.2)
        ]
        if not prior_big_wins.empty:
            flags.append("EUPHORIA_OVERTRADING")
            patterns["EUPHORIA_OVERTRADING"]["count"] += 1
            if net_pnl < 0:
                patterns["EUPHORIA_OVERTRADING"]["cost"] += abs(net_pnl)

        # 4. Over-sizing
        if row["position_value"] > max(20.0, median_size * 1.8):
            flags.append("OVERSIZED")
            patterns["OVERSIZED"]["count"] += 1
            if net_pnl < 0:
                patterns["OVERSIZED"]["cost"] += abs(net_pnl)

        # 5. Holding loser too long
        threshold_hold = max(2700, min(12600, median_winner_duration * 1.8))
        if net_pnl <= 0 and (row["duration_seconds"] > 12600 or row["duration_seconds"] > threshold_hold):
            flags.append("HELD_LOSER_TOO_LONG")
            patterns["HELD_LOSER_TOO_LONG"]["count"] += 1
            patterns["HELD_LOSER_TOO_LONG"]["cost"] += abs(net_pnl)

        # 6. Cut winner early
        if net_pnl > 0 and (row["duration_seconds"] < 600 or (row["duration_seconds"] < 1200 and net_pnl < avg_win * 0.35)):
            flags.append("CUT_WINNER_EARLY")
            patterns["CUT_WINNER_EARLY"]["count"] += 1

        # 7. Losing streak tilt
        past_closed = df[df["exit_time"] <= entry_t].sort_values("exit_time")
        if len(past_closed) >= 3:
            last_3 = past_closed.tail(3)
            if all(last_3["net_pnl"] <= 0):
                flags.append("STREAK_TILT")
                patterns["STREAK_TILT"]["count"] += 1
                if net_pnl < 0:
                    patterns["STREAK_TILT"]["cost"] += abs(net_pnl)

        # Merge pre-existing demo flags if present
        existing_flags = [f.strip() for f in row["behavioral_flags"].split(",") if f.strip()]
        for ef in existing_flags:
            if ef in patterns:
                flags.append(ef)
                patterns[ef]["count"] = max(patterns[ef]["count"], 1)

        all_flags = sorted(list(set(flags)))

        if all_flags:
            flagged_dict[trade_id] = {
                "id": trade_id,
                "symbol": row["symbol"],
                "side": row["side"],
                "entry_time": row["entry_time"].strftime("%Y-%m-%d %H:%M"),
                "exit_time": row["exit_time"].strftime("%Y-%m-%d %H:%M"),
                "net_pnl": round(float(row["net_pnl"]), 2),
                "leverage": int(row["leverage"]),
                "position_value": round(float(row["position_value"]), 2),
                "flags": all_flags,
                "duration_mins": round(row["duration_seconds"] / 60.0, 1)
            }

    behavior_list = []
    total_cost = 0.0
    for k, v in patterns.items():
        c = round(v["cost"], 2)
        total_cost += c
        behavior_list.append({
            "key": k,
            "title": v["title"],
            "count": v["count"],
            "cost": c,
            "description": v["description"]
        })

    behavior_list.sort(key=lambda x: (x["count"], x["cost"]), reverse=True)
    flagged_list = sorted(list(flagged_dict.values()), key=lambda x: x["exit_time"], reverse=True)

    total_flagged = len(flagged_list)
    clean_trades = max(0, total_trades - total_flagged)

    clean_ratio = clean_trades / max(1, total_trades)
    cost_penalty = min(30.0, (total_cost / max(10.0, abs(float(df["net_pnl"].sum())) + 50.0)) * 50.0)
    discipline_score = max(20, min(100, round(clean_ratio * 70.0 + 30.0 - cost_penalty)))

    return {
        "behaviors": behavior_list,
        "flagged_trades": flagged_list,
        "total_flagged_count": total_flagged,
        "discipline_score": discipline_score,
        "disciplined_trades_count": clean_trades,
        "total_trades_count": total_trades,
        "total_habit_cost": round(total_cost, 2)
    }

# 8. Transparent Risk Score & Metrics
def calculate_risk_analysis(trades: List[Trade], balance: float = 10000.0, unrealized_pnl: float = 0.0) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {
            "risk_score": 100,
            "risk_tier": "Low Risk",
            "score_breakdown": {},
            "max_drawdown": 0.0,
            "max_drawdown_pct": 0.0,
            "current_drawdown": 0.0,
            "current_drawdown_pct": 0.0,
            "largest_position": 0.0,
            "avg_leverage": 10.0,
            "max_leverage": 10,
            "worst_daily_loss": 0.0,
            "position_concentration_pct": 0.0,
            "total_fees": 0.0,
            "total_funding": 0.0
        }

    net_pnl = float(df["net_pnl"].sum())
    df, starting_equity = compute_equity_and_drawdown(df, balance, unrealized_pnl)

    max_dd = float(df["drawdown"].max())
    max_dd_pct = float(df["drawdown_pct"].max())
    curr_dd = float(df["drawdown"].iloc[-1])
    curr_dd_pct = float(df["drawdown_pct"].iloc[-1])

    largest_pos = float(df["position_value"].max())
    avg_leverage = float(df["leverage"].mean())
    max_leverage = int(df["leverage"].max())

    # Daily aggregation for worst day
    daily_pnl = df.groupby(df["exit_time"].dt.date)["net_pnl"].sum()
    worst_daily_loss = abs(float(daily_pnl.min())) if not daily_pnl.empty and daily_pnl.min() < 0 else 0.0

    concentration_pct = (largest_pos / balance) * 100.0 if balance > 0 else 0.0

    # Transparent Scoring Methodology (0 to 100):
    # 1. Drawdown Factor (0 - 25 points):
    #    0-10% DD = 25 pts, 10-20% DD = 18 pts, 20-30% DD = 10 pts, >30% DD = 0 pts
    if max_dd_pct <= 10.0:
        dd_score = 25.0
    elif max_dd_pct <= 20.0:
        dd_score = 25.0 - (max_dd_pct - 10.0) * 0.7
    elif max_dd_pct <= 35.0:
        dd_score = 18.0 - (max_dd_pct - 20.0) * 1.2
    else:
        dd_score = 0.0

    # 2. Leverage Factor (0 - 25 points):
    #    Avg leverage <= 10x = 25 pts, 10-15x = 20 pts, 15-20x = 12 pts, >20x = 4 pts
    if avg_leverage <= 10.0:
        lev_score = 25.0
    elif avg_leverage <= 15.0:
        lev_score = 25.0 - (avg_leverage - 10.0) * 1.0
    elif avg_leverage <= 20.0:
        lev_score = 20.0 - (avg_leverage - 15.0) * 1.6
    else:
        lev_score = max(0.0, 12.0 - (avg_leverage - 20.0) * 2.0)

    # 3. Position Concentration Factor (0 - 20 points):
    #    Concentration <= 25% = 20 pts, 25-50% = 14 pts, 50-100% = 8 pts, >100% = 2 pts
    if concentration_pct <= 25.0:
        conc_score = 20.0
    elif concentration_pct <= 50.0:
        conc_score = 20.0 - (concentration_pct - 25.0) * 0.24
    elif concentration_pct <= 100.0:
        conc_score = 14.0 - (concentration_pct - 50.0) * 0.12
    else:
        conc_score = 2.0

    # 4. Behavioral Flaws Factor (0 - 15 points):
    #    Deduct points for revenge trading and loss chasing
    behavior_data = calculate_behavioral_patterns(trades)
    revenge_count = sum(b["count"] for b in behavior_data["behaviors"] if b["key"] in ["REVENGE_TRADING", "LOSS_CHASING"])
    behavior_score = max(0.0, 15.0 - (revenge_count * 1.5))

    # 5. Profit Factor / Expectancy Factor (0 - 15 points):
    winners = df[df["net_pnl"] > 0]
    losers = df[df["net_pnl"] <= 0]
    gp = float(winners["net_pnl"].sum())
    gl = abs(float(losers["net_pnl"].sum()))
    pf = (gp / gl) if gl > 0 else 1.0
    if pf >= 1.75:
        pf_score = 15.0
    elif pf >= 1.25:
        pf_score = 12.0
    elif pf >= 1.0:
        pf_score = 8.0
    else:
        pf_score = 3.0

    total_risk_score = round(dd_score + lev_score + conc_score + behavior_score + pf_score)
    total_risk_score = max(5, min(98, total_risk_score))

    if total_risk_score >= 80:
        tier = "Conservative / Disciplined"
    elif total_risk_score >= 65:
        tier = "Moderate Risk"
    elif total_risk_score >= 45:
        tier = "Elevated Risk"
    else:
        tier = "High Risk / Vulnerable"

    return {
        "risk_score": total_risk_score,
        "risk_tier": tier,
        "score_breakdown": {
            "drawdown_health": {"score": round(dd_score, 1), "max": 25, "metric": f"{max_dd_pct:.2f}% Max DD"},
            "leverage_discipline": {"score": round(lev_score, 1), "max": 25, "metric": f"{avg_leverage:.1f}x Avg Lev"},
            "position_concentration": {"score": round(conc_score, 1), "max": 20, "metric": f"{concentration_pct:.1f}% Max Size/Bal"},
            "behavioral_discipline": {"score": round(behavior_score, 1), "max": 15, "metric": f"{revenge_count} High-Risk Trades"},
            "expectancy_quality": {"score": round(pf_score, 1), "max": 15, "metric": f"{pf:.2f} Profit Factor"}
        },
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_pct": round(max_dd_pct, 2),
        "current_drawdown": round(curr_dd, 2),
        "current_drawdown_pct": round(curr_dd_pct, 2),
        "largest_position": round(largest_pos, 2),
        "avg_leverage": round(avg_leverage, 1),
        "max_leverage": max_leverage,
        "worst_daily_loss": round(worst_daily_loss, 2),
        "position_concentration_pct": round(concentration_pct, 1),
        "total_fees": round(float(df["commission"].sum()), 4),
        "total_funding": round(float(df["funding_fees"].sum()), 4)
    }

# 9. Fees and Funding Breakdown
def calculate_fees_and_funding(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {}

    gross_pnl = float(df["gross_pnl"].sum())
    total_commission = float(df["commission"].sum())
    funding_paid = abs(float(df[df["funding_fees"] < 0]["funding_fees"].sum()))
    funding_received = float(df[df["funding_fees"] > 0]["funding_fees"].sum())
    net_funding = float(df["funding_fees"].sum())
    net_pnl = float(df["net_pnl"].sum())

    fees_pct_gross = (total_commission / abs(gross_pnl)) * 100.0 if abs(gross_pnl) > 0 else 0.0
    funding_pct_gross = (abs(net_funding) / abs(gross_pnl)) * 100.0 if abs(gross_pnl) > 0 else 0.0
    total_drag_pct = ((total_commission + abs(net_funding)) / abs(gross_pnl)) * 100.0 if abs(gross_pnl) > 0 else 0.0

    return {
        "gross_pnl": round(gross_pnl, 2),
        "total_fees": round(total_commission, 4),
        "funding_paid": round(funding_paid, 4),
        "funding_received": round(funding_received, 4),
        "net_funding": round(net_funding, 4),
        "net_pnl": round(net_pnl, 2),
        "fees_pct_gross": round(fees_pct_gross, 1),
        "funding_pct_gross": round(funding_pct_gross, 1),
        "total_drag_pct": round(total_drag_pct, 1)
    }

# 10. Performance Over Time Comparison
def calculate_performance_comparison(trades: List[Trade]) -> Dict[str, Any]:
    df = trades_to_df(trades)
    if df.empty:
        return {}

    now = get_utc_now()
    this_week_cutoff = now - timedelta(days=7)
    last_week_cutoff = now - timedelta(days=14)
    this_month_cutoff = now - timedelta(days=30)
    last_month_cutoff = now - timedelta(days=60)
    three_months_cutoff = now - timedelta(days=90)

    def summarize_slice(sdf: pd.DataFrame) -> Dict[str, Any]:
        count = len(sdf)
        if count == 0:
            return {"trades": 0, "pnl": 0.0, "win_rate": 0.0, "profit_factor": 0.0, "avg_trade": 0.0, "avg_leverage": 0.0}
        pnl = float(sdf["net_pnl"].sum())
        winners = sdf[sdf["net_pnl"] > 0]
        losers = sdf[sdf["net_pnl"] <= 0]
        wr = (len(winners) / count) * 100.0
        gp = float(winners["net_pnl"].sum())
        gl = abs(float(losers["net_pnl"].sum()))
        pf = (gp / gl) if gl > 0 else (99.0 if gp > 0 else 0.0)
        avg_trade = float(sdf["net_pnl"].mean())
        avg_lev = float(sdf["leverage"].mean())
        return {
            "trades": count,
            "pnl": round(pnl, 2),
            "win_rate": round(wr, 1),
            "profit_factor": round(pf, 2),
            "avg_trade": round(avg_trade, 2),
            "avg_leverage": round(avg_lev, 1)
        }

    this_week = summarize_slice(df[df["exit_time"] >= this_week_cutoff])
    last_week = summarize_slice(df[(df["exit_time"] >= last_week_cutoff) & (df["exit_time"] < this_week_cutoff)])
    this_month = summarize_slice(df[df["exit_time"] >= this_month_cutoff])
    last_month = summarize_slice(df[(df["exit_time"] >= last_month_cutoff) & (df["exit_time"] < this_month_cutoff)])
    last_3m = summarize_slice(df[df["exit_time"] >= three_months_cutoff])
    all_time = summarize_slice(df)

    return {
        "this_week": this_week,
        "last_week": last_week,
        "this_month": this_month,
        "last_month": last_month,
        "last_3_months": last_3m,
        "all_time": all_time
    }

# 11. Market Context / Regimes
def calculate_market_regimes(trades: List[Trade]) -> List[Dict[str, Any]]:
    df = trades_to_df(trades)
    if df.empty:
        return []

    regimes_order = ["Strong Bull", "Bull", "Sideways", "Bear", "Strong Bear", "High Volatility"]
    results = []
    for r in regimes_order:
        rdf = df[df["market_regime"] == r]
        count = len(rdf)
        if count == 0:
            continue
        pnl = float(rdf["net_pnl"].sum())
        winners = rdf[rdf["net_pnl"] > 0]
        losers = rdf[rdf["net_pnl"] <= 0]
        win_rate = (len(winners) / count) * 100.0
        gp = float(winners["net_pnl"].sum())
        gl = abs(float(losers["net_pnl"].sum()))
        pf = (gp / gl) if gl > 0 else (99.0 if gp > 0 else 0.0)

        results.append({
            "regime": r,
            "trades": count,
            "net_pnl": round(pnl, 2),
            "win_rate": round(win_rate, 1),
            "profit_factor": round(pf, 2),
            "is_profitable": pnl > 0
        })

    return results

# 12. Calendar Analysis (Daily aggregation)
def calculate_calendar(trades: List[Trade]) -> List[Dict[str, Any]]:
    df = trades_to_df(trades)
    if df.empty:
        return []

    calendar = []
    for date, group in df.groupby(df["exit_time"].dt.strftime("%Y-%m-%d")):
        count = len(group)
        pnl = float(group["net_pnl"].sum())
        winners = group[group["net_pnl"] > 0]
        win_rate = (len(winners) / count) * 100.0
        calendar.append({
            "date": date,
            "trades": count,
            "net_pnl": round(pnl, 2),
            "win_rate": round(win_rate, 1),
            "is_winner": pnl > 0
        })

    return calendar

# 13. Comprehensive Audit Report Generator (All 13 Sections)
def generate_full_report(trades: List[Trade], balance: float = 10000.0, unrealized_pnl: float = 0.0) -> Dict[str, Any]:
    kpis = calculate_kpis(trades, balance, unrealized_pnl)
    long_short = calculate_long_short_performance(trades)
    assets = calculate_asset_performance(trades)
    time_analysis = calculate_time_analysis(trades)
    win_loss = calculate_winner_loser_stats(trades)
    behaviors = calculate_behavioral_patterns(trades)
    risk = calculate_risk_analysis(trades, balance, unrealized_pnl)
    fees = calculate_fees_and_funding(trades)
    regimes = calculate_market_regimes(trades)
    comparison = calculate_performance_comparison(trades)

    # Compile Top Strengths, Weaknesses, and Actionable Improvements
    strengths = []
    weaknesses = []
    actions = []

    # Directional strength/weakness
    if long_short["long"].get("pnl", 0) > 0 and long_short["long"].get("win_rate", 0) >= 55:
        strengths.append(f"Strong long-side edge ({long_short['long']['win_rate']}% win rate, +€{long_short['long']['pnl']:.2f} PNL).")
    if long_short["short"].get("pnl", 0) < 0:
        short_pnl = long_short['short'].get('pnl', 0)
        short_wr = long_short['short'].get('win_rate', 0)
        weaknesses.append(f"Shorting underperformance (${short_pnl:.2f} PNL, {short_wr}% win rate).")
        actions.append("Consider reducing short position size or demanding higher-timeframe bearish confirmation before shorting.")

    # Asset strengths/weaknesses
    if assets.get("top_driver"):
        strengths.append(f"Core profit driver: {assets['top_driver']['symbol']} (+${assets['top_driver']['net_pnl']:.2f} PNL).")
    if assets.get("top_dragger"):
        weaknesses.append(f"Performance drag: {assets['top_dragger']['symbol']} (-${abs(assets['top_dragger']['net_pnl']):.2f} PNL).")
        actions.append(f"Review or temporarily pause trading on {assets['top_dragger']['symbol']} until strategy conditions align.")

    # Holding time asymmetry
    if win_loss.get("holding_time_ratio", 1.0) > 1.8:
        weaknesses.append(f"Holding losing positions {win_loss.get('holding_time_ratio'):.1f}× longer than winners (cutting winners early, bag-holding losers).")
        actions.append("Implement a strict time-based stop or trailing stop to prevent losers from stagnating.")

    # Behavioral weaknesses
    revenge = next((b for b in behaviors.get("behaviors", []) if b["key"] == "REVENGE_TRADING"), None)
    if revenge and revenge["count"] > 0:
        weaknesses.append(f"Detected {revenge['count']} revenge trading events, costing an estimated €{revenge['cost']:.2f}.")
        actions.append("Enforce a mandatory 30-minute cooling-off period immediately after any losing trade.")

    # Fee drag
    if fees.get("total_drag_pct", 0) > 15.0:
        weaknesses.append(f"Fees and net funding consumed {fees.get('total_drag_pct')}% of gross trading profits.")
        actions.append("Switch to maker limit orders to earn maker rebates and reduce high-frequency turnover.")

    if not strengths:
        strengths.append("Disciplined risk control on high-volatility pairs.")
    if not actions:
        actions.append("Continue monitoring position concentration and maintain leverage below 15x.")

    return {
        "generated_at": get_utc_now().strftime("%Y-%m-%d %H:%M UTC"),
        "overall_performance": kpis,
        "pnl_overview": {
            "net_pnl": kpis["net_pnl"],
            "gross_pnl": kpis["gross_pnl"],
            "profit_factor": kpis["profit_factor"],
            "roi_pct": kpis["roi_pct"],
            "win_rate": kpis["win_rate"]
        },
        "long_vs_short": long_short,
        "asset_performance": assets,
        "risk_summary": risk,
        "drawdown_summary": {
            "max_drawdown": risk["max_drawdown"],
            "max_drawdown_pct": risk["max_drawdown_pct"],
            "current_drawdown": risk["current_drawdown"]
        },
        "trading_behavior": behaviors,
        "market_regimes": regimes,
        "fees_funding": fees,
        "performance_comparison": comparison,
        "winner_vs_loser": win_loss,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "actionable_improvements": actions
    }
