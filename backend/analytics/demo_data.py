"""
Realistic Demo Data Generator for Personal Binance Futures Trading Analysis.
Generates ~180 realistic closed trades across BTC, ETH, SOL, BNB, DOGE spanning 90 days.
Includes authentic behavioral patterns, streaks, fee/funding itemization, and market regimes.
"""
import random
from datetime import datetime, timezone, timedelta
from typing import List
from backend.database.models import Trade, IncomeItem

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def generate_demo_trades() -> List[Trade]:
    random.seed(42)  # Deterministic seed for reproducible, realistic demo data

    # Symbols config with calibrated positive edge on BTC/ETH/BNB and dragger on SOL/DOGE
    symbols_config = {
        "BTCUSDT": {"base_price": 64000.0, "win_bias": 0.65, "win_mult": 1.6, "leverage_range": (10, 20)},
        "ETHUSDT": {"base_price": 3400.0, "win_bias": 0.58, "win_mult": 1.4, "leverage_range": (10, 20)},
        "SOLUSDT": {"base_price": 145.0, "win_bias": 0.38, "win_mult": 0.9, "leverage_range": (10, 25)},  # Dragger
        "BNBUSDT": {"base_price": 580.0, "win_bias": 0.56, "win_mult": 1.2, "leverage_range": (5, 15)},
        "DOGEUSDT": {"base_price": 0.12, "win_bias": 0.42, "win_mult": 0.9, "leverage_range": (10, 25)}, # Dragger
    }

    # Generate trades over past 90 days
    now = get_utc_now()
    start_date = now - timedelta(days=90)
    
    trades: List[Trade] = []
    trade_counter = 1001

    current_cursor = start_date
    consecutive_losses = 0
    previous_trade_loss = False
    last_exit_time = None

    while current_cursor < now:
        # Determine number of trades for this day
        is_overtrading_day = random.random() < 0.09
        trades_today = random.randint(5, 8) if is_overtrading_day else random.randint(1, 3)

        for _ in range(trades_today):
            if current_cursor >= now:
                break

            # Pick symbol
            sym_weights = [0.42, 0.26, 0.16, 0.10, 0.06]
            symbol = random.choices(list(symbols_config.keys()), weights=sym_weights)[0]
            conf = symbols_config[symbol]

            # Side: 65% Long, 35% Short. Longs are notably more profitable.
            side = "LONG" if random.random() < 0.65 else "SHORT"

            # Entry time
            if last_exit_time and previous_trade_loss and random.random() < 0.40:
                # REVENGE TRADE: entry within 4 to 14 minutes of previous loss
                entry_time = last_exit_time + timedelta(minutes=random.randint(4, 14))
                is_revenge = True
            else:
                gap_hours = random.uniform(2.0, 16.0)
                entry_time = current_cursor + timedelta(hours=gap_hours)
                is_revenge = False

            if entry_time >= now:
                break

            # Sizing & Leverage
            base_size = random.uniform(1500.0, 2800.0)
            leverage = random.randint(conf["leverage_range"][0], conf["leverage_range"][1])

            is_oversized = False
            is_loss_chase = False

            if is_revenge or (previous_trade_loss and random.random() < 0.35):
                # Loss chasing: increasing size & leverage after a loss
                base_size = base_size * random.uniform(1.8, 2.4)
                leverage = min(25, leverage + 5)
                is_loss_chase = True

            if random.random() < 0.06 and not is_loss_chase:
                # Outlier over-sizing
                base_size = base_size * random.uniform(2.2, 3.2)
                is_oversized = True

            position_value = round(base_size, 2)
            margin_used = round(position_value / leverage, 2)

            # Determine win or loss
            win_prob = conf["win_bias"]
            if side == "LONG":
                win_prob += 0.08
            else:
                win_prob -= 0.12

            if is_revenge:
                win_prob -= 0.18
            if is_loss_chase:
                win_prob -= 0.12
            if consecutive_losses >= 3:
                win_prob -= 0.15

            win_prob = max(0.15, min(0.85, win_prob))
            is_winner = random.random() < win_prob

            # Duration
            if is_winner:
                if random.random() < 0.30:
                    # Early profit cut
                    duration_seconds = random.randint(600, 1800)
                    is_early_profit = True
                else:
                    duration_seconds = random.randint(2400, 14400) # 40m to 4h
                    is_early_profit = False
            else:
                # Holding losers too long: 2 hours to 8 hours
                duration_seconds = random.randint(7200, 28800)
                is_early_profit = False

            exit_time = entry_time + timedelta(seconds=duration_seconds)
            if exit_time >= now:
                exit_time = now - timedelta(minutes=5)
                duration_seconds = max(60, int((exit_time - entry_time).total_seconds()))

            # Price calculations
            entry_price = round(conf["base_price"] * (1 + random.uniform(-0.06, 0.06)), 2 if conf["base_price"] > 1 else 4)
            quantity = round(position_value / entry_price, 4 if conf["base_price"] > 10 else 2)

            # Move %
            if is_winner:
                move_pct = random.uniform(0.012, 0.042) * conf["win_mult"]
            else:
                move_pct = -random.uniform(0.010, 0.035)

            if side == "LONG":
                exit_price = round(entry_price * (1 + move_pct), 2 if conf["base_price"] > 1 else 4)
            else:
                exit_price = round(entry_price * (1 - move_pct), 2 if conf["base_price"] > 1 else 4)

            # PnL
            if side == "LONG":
                gross_pnl = round((exit_price - entry_price) * quantity, 2)
            else:
                gross_pnl = round((entry_price - exit_price) * quantity, 2)

            if is_winner and gross_pnl <= 0:
                gross_pnl = round(abs(gross_pnl) + random.uniform(25.0, 75.0), 2)
            elif not is_winner and gross_pnl >= 0:
                gross_pnl = -round(abs(gross_pnl) + random.uniform(20.0, 60.0), 2)

            pnl_percentage = round((gross_pnl / margin_used) * 100, 2)
            commission = round(position_value * 0.0008, 2)

            eight_hour_periods = max(1, duration_seconds // 28800)
            if random.random() < 0.65:
                funding_fees = -round(position_value * 0.00012 * eight_hour_periods, 2)
            else:
                funding_fees = round(position_value * 0.00008 * eight_hour_periods, 2)

            net_pnl = round(gross_pnl - commission + funding_fees, 2)

            # Behavioral flags
            flags = []
            if is_revenge:
                flags.append("REVENGE_TRADING")
            if is_loss_chase:
                flags.append("LOSS_CHASING")
            if is_oversized:
                flags.append("OVERSIZED")
            if is_overtrading_day:
                flags.append("OVERTRADING")
            if not is_winner and duration_seconds > 14400:
                flags.append("HELD_LOSER_TOO_LONG")
            if is_winner and is_early_profit:
                flags.append("CUT_WINNER_EARLY")

            # Determine market regime
            day_offset = (entry_time - start_date).days
            if day_offset < 25:
                regime = "Bull"
            elif day_offset < 48:
                regime = "Strong Bull"
            elif day_offset < 70:
                regime = "Sideways"
            elif day_offset < 82:
                regime = "Bear"
            else:
                regime = "High Volatility"

            trade = Trade(
                id=f"demo_tr_{trade_counter}",
                symbol=symbol,
                side=side,
                entry_time=entry_time,
                exit_time=exit_time,
                entry_price=entry_price,
                exit_price=exit_price,
                quantity=quantity,
                position_value=position_value,
                leverage=leverage,
                gross_pnl=gross_pnl,
                pnl_percentage=pnl_percentage,
                commission=commission,
                funding_fees=funding_fees,
                net_pnl=net_pnl,
                duration_seconds=duration_seconds,
                is_winner=(net_pnl > 0),
                behavioral_flags=",".join(flags),
                market_regime=regime,
                notes="Flagged: " + ", ".join(flags) if flags else "Clean execution",
                is_demo=True
            )
            trades.append(trade)
            trade_counter += 1

            if net_pnl > 0:
                consecutive_losses = 0
                previous_trade_loss = False
            else:
                consecutive_losses += 1
                previous_trade_loss = True

            last_exit_time = exit_time
            current_cursor = exit_time

        current_cursor += timedelta(days=1)

    # Ensure active intra-day trades within the past 24 hours so 1D charts and live metrics have today's trades
    recent_count = len([t for t in trades if t.exit_time >= now - timedelta(hours=24)])
    if recent_count < 2:
        recent_samples = [
            ("ETHUSDT", "LONG", now - timedelta(hours=14, minutes=30), now - timedelta(hours=13, minutes=45), 3450.0, 3510.0, 0.65, 10, 39.0, 1.1, 0.0),
            ("BTCUSDT", "SHORT", now - timedelta(hours=8, minutes=15), now - timedelta(hours=6, minutes=50), 64800.0, 64250.0, 0.04, 15, 22.0, 1.2, 0.0),
            ("SOLUSDT", "LONG", now - timedelta(hours=2, minutes=40), now - timedelta(hours=1, minutes=55), 142.50, 144.20, 15.0, 20, 25.5, 0.8, 0.0),
        ]
        for sym, side, ent_t, ex_t, ent_p, ex_p, qty, lev, pnl, comm, fund in recent_samples:
            pos_val = round(ent_p * qty, 2)
            dur = int((ex_t - ent_t).total_seconds())
            trades.append(Trade(
                id=f"demo_tr_{trade_counter}",
                symbol=sym,
                side=side,
                entry_time=ent_t,
                exit_time=ex_t,
                entry_price=ent_p,
                exit_price=ex_p,
                quantity=qty,
                position_value=pos_val,
                leverage=lev,
                gross_pnl=pnl + comm,
                pnl_percentage=round((pnl / (pos_val / lev)) * 100, 2),
                commission=comm,
                funding_fees=fund,
                net_pnl=pnl,
                duration_seconds=dur,
                is_winner=(pnl > 0),
                behavioral_flags="",
                market_regime="Sideways",
                notes="Clean execution",
                is_demo=True
            ))
            trade_counter += 1

    return trades


def generate_demo_income_items(trades: List[Trade]) -> List[IncomeItem]:
    items: List[IncomeItem] = []
    idx = 1
    for t in trades:
        comm_key = f"demo_inc_comm_{idx}"
        items.append(IncomeItem(
            id=comm_key,
            tran_id=comm_key,
            symbol=t.symbol,
            income_type="COMMISSION",
            income=-t.commission,
            asset="USDT",
            time=t.exit_time,
            raw_timestamp=int(t.exit_time.timestamp() * 1000),
            is_demo=True
        ))
        idx += 1

        rpnl_key = f"demo_inc_rpnl_{idx}"
        items.append(IncomeItem(
            id=rpnl_key,
            tran_id=rpnl_key,
            symbol=t.symbol,
            income_type="REALIZED_PNL",
            income=t.gross_pnl,
            asset="USDT",
            time=t.exit_time,
            raw_timestamp=int(t.exit_time.timestamp() * 1000),
            is_demo=True
        ))
        idx += 1

        if t.funding_fees != 0.0:
            fund_key = f"demo_inc_fund_{idx}"
            items.append(IncomeItem(
                id=fund_key,
                tran_id=fund_key,
                symbol=t.symbol,
                income_type="FUNDING_FEE",
                income=t.funding_fees,
                asset="USDT",
                time=t.entry_time + timedelta(seconds=t.duration_seconds // 2),
                raw_timestamp=int(t.entry_time.timestamp() * 1000),
                is_demo=True
            ))
            idx += 1

    return items


def generate_demo_positions():
    """
    Generate calibrated demo open positions with realistic market risk parameters,
    varied liquidation buffers (Safe, Moderate, Elevated), and live funding rates.
    """
    return [
        {
            "symbol": "BTCUSDT",
            "positionAmt": "0.050",
            "entryPrice": "64200.00",
            "markPrice": "64850.00",
            "unRealizedProfit": "32.50",
            "liquidationPrice": "57450.00",
            "leverage": "15",
            "marginType": "cross",
            "isolatedMargin": "0.0",
            "positionSide": "BOTH",
            "notional": "3242.50",
            "lastFundingRate": "0.000100",  # +0.01%
        },
        {
            "symbol": "ETHUSDT",
            "positionAmt": "-0.750",
            "entryPrice": "3480.00",
            "markPrice": "3415.00",
            "unRealizedProfit": "48.75",
            "liquidationPrice": "3950.00",
            "leverage": "10",
            "marginType": "cross",
            "isolatedMargin": "0.0",
            "positionSide": "BOTH",
            "notional": "2561.25",
            "lastFundingRate": "0.000120",  # +0.012%
        },
        {
            "symbol": "SOLUSDT",
            "positionAmt": "12.000",
            "entryPrice": "145.00",
            "markPrice": "141.80",
            "unRealizedProfit": "-38.40",
            "liquidationPrice": "133.50",
            "leverage": "20",
            "marginType": "isolated",
            "isolatedMargin": "85.08",
            "positionSide": "BOTH",
            "notional": "1701.60",
            "lastFundingRate": "0.000080",  # +0.008%
        }
    ]

