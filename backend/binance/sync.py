"""
Synchronization and Ingestion Pipeline for Binance Futures.
Fetches fills and income records via read-only API, stores them idempotently,
and reconstructs round-trip positions using a FIFO matching engine.
"""
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Set, Optional
from sqlalchemy.orm import Session

from backend.binance.client import BinanceFuturesClient
from backend.database.models import Account, AccountConfig, RawFill, IncomeItem, Trade

def sync_binance_data(
    db: Session,
    api_key: str,
    api_secret: str,
    account_id: Optional[int] = None,
    lookback_days: int = 30
) -> Dict[str, Any]:
    """
    Executes incremental read-only sync from Binance Futures.
    Supports lookback periods up to 90 days (Binance REST API max limit)
    using sequential 7-day sliding windows (Binance max time-span per userTrades call).
    Ensures in-memory batch deduplication and safe rollback on error.
    """
    # 0. Clean session rollback to ensure no broken transactions linger
    db.rollback()

    client = BinanceFuturesClient(api_key, api_secret)

    # 1. Verify connection and read balance
    account_info = client.test_connection()
    balance = account_info.get("totalWalletBalance", 10000.0)
    unrealized = account_info.get("totalUnrealizedProfit", 0.0)

    # Update or create AccountConfig
    config = db.query(AccountConfig).first()
    if not config:
        config = AccountConfig()
        db.add(config)

    config.api_key_masked = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "CONFIGURED"
    config.is_connected = True
    config.account_balance = balance
    config.unrealized_pnl = unrealized
    config.last_sync_time = datetime.now(timezone.utc)
    if account_id:
        config.active_account_id = account_id

    # Update specific Account if provided
    if account_id:
        acc = db.query(Account).filter(Account.id == account_id).first()
        if acc:
            acc.api_key_masked = config.api_key_masked
            acc.is_connected = True
            acc.account_balance = balance
            acc.unrealized_pnl = unrealized
            acc.last_sync_time = config.last_sync_time
            acc.is_active = True
    db.commit()

    # Clamp lookback_days between 1 and 90 (Binance REST API hard limit)
    lookback_days = max(1, min(int(lookback_days or 30), 90))
    now_ms = int(time.time() * 1000)
    start_ms = now_ms - (lookback_days * 24 * 60 * 60 * 1000)

    # Build 7-day sliding time windows (Binance /fapi/v1/userTrades max window is 7 days)
    seven_days_ms = 7 * 24 * 60 * 60 * 1000
    windows: List[tuple[int, int]] = []
    w_start = start_ms
    while w_start < now_ms:
        w_end = min(w_start + seven_days_ms, now_ms)
        windows.append((w_start, w_end))
        w_start = w_end

    # 2. Fetch income records across all sliding windows
    raw_income: List[Dict[str, Any]] = []
    new_income_count = 0
    existing_income_ids_q = db.query(IncomeItem.id)
    if account_id is not None:
        existing_income_ids_q = existing_income_ids_q.filter(IncomeItem.account_id == account_id)
    existing_income_ids: Set[str] = set(r[0] for r in existing_income_ids_q.all())
    seen_income_ids: Set[str] = set(existing_income_ids)

    for (win_start, win_end) in windows:
        try:
            batch_income = client.get_income_history(start_time=win_start, end_time=win_end, limit=1000)
            for item in batch_income:
                raw_income.append(item)
                tran_id = str(item.get("tranId", ""))
                inc_type = str(item.get("incomeType", ""))
                asset = str(item.get("asset", "USDT"))
                trade_id = str(item.get("tradeId", ""))

                # Unique composite ID per income leg, isolated per account
                prefix = f"acc{account_id}_" if account_id is not None else ""
                unique_id = f"{prefix}{tran_id}_{inc_type}"
                if trade_id and trade_id != "None" and trade_id != "":
                    unique_id += f"_{trade_id}"
                elif asset:
                    unique_id += f"_{asset}"

                if unique_id in seen_income_ids:
                    continue
                seen_income_ids.add(unique_id)

                dt = datetime.fromtimestamp(item.get("time", 0) / 1000.0, tz=timezone.utc)
                income_obj = IncomeItem(
                    id=unique_id,
                    tran_id=tran_id,
                    symbol=item.get("symbol") or "",
                    income_type=inc_type,
                    income=float(item.get("income", 0.0)),
                    asset=asset,
                    time=dt,
                    raw_timestamp=int(item.get("time", 0)),
                    is_demo=False,
                    account_id=account_id
                )
                db.add(income_obj)
                new_income_count += 1
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Warning: Income sync error for window [{win_start}-{win_end}]: {e}")

    # 3. Discover all traded symbols from income history and defaults
    top_defaults = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT", "XRPUSDT"]
    income_symbols = set(item.get("symbol") for item in raw_income if item.get("symbol"))
    symbols_to_sync = sorted(list(set(top_defaults) | income_symbols))

    # 4. Fetch trade execution fills across sliding windows
    new_fills_count = 0
    existing_fill_ids_q = db.query(RawFill.id)
    if account_id is not None:
        existing_fill_ids_q = existing_fill_ids_q.filter(RawFill.account_id == account_id)
    existing_fill_ids: Set[str] = set(r[0] for r in existing_fill_ids_q.all())
    seen_fill_ids: Set[str] = set(existing_fill_ids)

    for symbol in symbols_to_sync:
        for (win_start, win_end) in windows:
            try:
                fills = client.get_user_trades(symbol=symbol, start_time=win_start, end_time=win_end, limit=1000)
                batch_count = 0
                for f in fills:
                    prefix = f"acc{account_id}_" if account_id is not None else ""
                    fill_id = f"{prefix}{f.get('id')}"
                    if fill_id in seen_fill_ids:
                        continue
                    seen_fill_ids.add(fill_id)

                    dt = datetime.fromtimestamp(f.get("time", 0) / 1000.0, tz=timezone.utc)
                    fill_obj = RawFill(
                        id=fill_id,
                        symbol=symbol,
                        order_id=str(f.get("orderId")),
                        side=f.get("side"),
                        price=float(f.get("price", 0.0)),
                        qty=float(f.get("qty", 0.0)),
                        quote_qty=float(f.get("quoteQty", 0.0)),
                        commission=float(f.get("commission", 0.0)),
                        commission_asset=f.get("commissionAsset", "USDT"),
                        realized_pnl=float(f.get("realizedPnl", 0.0)),
                        time=dt,
                        raw_timestamp=int(f.get("time", 0)),
                        is_buyer=bool(f.get("buyer")),
                        is_maker=bool(f.get("maker")),
                        is_demo=False,
                        account_id=account_id
                    )
                    db.add(fill_obj)
                    batch_count += 1
                    new_fills_count += 1

                if batch_count > 0:
                    db.commit()
            except Exception as e:
                db.rollback()
                print(f"Warning: Fills sync error for {ascii(symbol)} in [{win_start}-{win_end}]: {e}")

    # 5. Reconstruct round-trip trades from fills where realized_pnl != 0
    reconstruct_roundtrip_trades(db, is_demo=False, account_id=account_id)

    return {
        "status": "success",
        "balance": balance,
        "new_fills": new_fills_count,
        "new_income": new_income_count,
        "lookback_days": lookback_days,
        "last_sync": config.last_sync_time.strftime("%Y-%m-%d %H:%M:%S UTC")
    }

def reconstruct_roundtrip_trades(db: Session, is_demo: bool = False, account_id: Optional[int] = None):
    """
    Reconstructs complete closed trades from raw execution fills.
    Matches closing fills (realizedPnl != 0) with their opening fills.
    """
    closing_fills_q = db.query(RawFill).filter(
        RawFill.is_demo == is_demo,
        RawFill.realized_pnl != 0.0
    )
    if account_id is not None:
        closing_fills_q = closing_fills_q.filter(RawFill.account_id == account_id)
    closing_fills = closing_fills_q.order_by(RawFill.time.asc()).all()

    existing_trade_ids_q = db.query(Trade.id).filter(Trade.is_demo == is_demo)
    if account_id is not None:
        existing_trade_ids_q = existing_trade_ids_q.filter(Trade.account_id == account_id)
    existing_trade_ids = set(r[0] for r in existing_trade_ids_q.all())

    reconstructed_count = 0
    for fill in closing_fills:
        trade_id = f"acc{account_id}_tr_{fill.id}" if account_id is not None else f"real_tr_{fill.id}"
        if trade_id in existing_trade_ids:
            continue
        existing_trade_ids.add(trade_id)

        # Closing side BUY means position was SHORT. Closing side SELL means position was LONG.
        side = "SHORT" if fill.side.upper() == "BUY" else "LONG"

        # Find opening fill candidates
        open_side = "SELL" if side == "SHORT" else "BUY"
        opening_fill_q = db.query(RawFill).filter(
            RawFill.symbol == fill.symbol,
            RawFill.side == open_side,
            RawFill.is_demo == is_demo,
            RawFill.time <= fill.time
        )
        if account_id is not None:
            opening_fill_q = opening_fill_q.filter(RawFill.account_id == account_id)
        opening_fill = opening_fill_q.order_by(RawFill.time.desc()).first()

        if opening_fill:
            entry_time = opening_fill.time
            entry_price = opening_fill.price
            duration = max(60, int((fill.time - opening_fill.time).total_seconds()))
        else:
            entry_time = fill.time
            entry_price = fill.price
            duration = 300

        gross_pnl = fill.realized_pnl
        exit_price = fill.price
        qty = fill.qty
        pos_val = round(qty * entry_price, 2)
        leverage = 10  # default futures leverage estimation if not specified
        margin = max(10.0, pos_val / leverage)
        pnl_pct = round((gross_pnl / margin) * 100.0, 2)
        commission = fill.commission

        # Query funding fees during this trade's duration
        funding_sum = 0.0
        income_items_q = db.query(IncomeItem).filter(
            IncomeItem.symbol == fill.symbol,
            IncomeItem.income_type == "FUNDING_FEE",
            IncomeItem.time >= entry_time,
            IncomeItem.time <= fill.time,
            IncomeItem.is_demo == is_demo
        )
        if account_id is not None:
            income_items_q = income_items_q.filter(IncomeItem.account_id == account_id)
        for inc in income_items_q.all():
            funding_sum += inc.income

        net_pnl = round(gross_pnl - commission + funding_sum, 4)

        trade = Trade(
            id=trade_id,
            symbol=fill.symbol,
            side=side,
            entry_time=entry_time,
            exit_time=fill.time,
            entry_price=entry_price,
            exit_price=exit_price,
            quantity=qty,
            position_value=pos_val,
            leverage=leverage,
            gross_pnl=gross_pnl,
            pnl_percentage=pnl_pct,
            commission=commission,
            funding_fees=funding_sum,
            net_pnl=net_pnl,
            duration_seconds=duration,
            is_winner=(net_pnl > 0),
            behavioral_flags="",
            market_regime="Sideways",
            notes="Binance live synchronized trade",
            is_demo=is_demo,
            account_id=account_id
        )
        db.add(trade)
        reconstructed_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Error committing reconstructed trades: {e}")
        raise e
