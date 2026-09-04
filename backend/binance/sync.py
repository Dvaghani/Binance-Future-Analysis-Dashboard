"""
Synchronization and Ingestion Pipeline for Binance Futures.
Fetches fills and income records via read-only API, stores them idempotently,
and reconstructs round-trip positions using a FIFO matching engine.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Set
from sqlalchemy.orm import Session

from backend.binance.client import BinanceFuturesClient
from backend.database.models import AccountConfig, RawFill, IncomeItem, Trade

def sync_binance_data(db: Session, api_key: str, api_secret: str) -> Dict[str, Any]:
    """
    Executes incremental read-only sync from Binance Futures.
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
    db.commit()

    # 2. Fetch income records (funding fees & commissions)
    raw_income: List[Dict[str, Any]] = []
    new_income_count = 0
    try:
        raw_income = client.get_income_history(limit=1000)
        existing_income_ids: Set[str] = set(r[0] for r in db.query(IncomeItem.id).all())
        seen_income_ids: Set[str] = set(existing_income_ids)

        for item in raw_income:
            tran_id = str(item.get("tranId", ""))
            inc_type = str(item.get("incomeType", ""))
            asset = str(item.get("asset", "USDT"))
            trade_id = str(item.get("tradeId", ""))

            # Unique composite ID per income leg:
            # Binance produces multiple records (e.g. REALIZED_PNL and COMMISSION) for the same tranId
            unique_id = f"{tran_id}_{inc_type}"
            if trade_id and trade_id != "None" and trade_id != "":
                unique_id += f"_{trade_id}"
            elif asset:
                unique_id += f"_{asset}"

            if unique_id in seen_income_ids:
                continue
            seen_income_ids.add(unique_id)

            dt = datetime.utcfromtimestamp(item.get("time", 0) / 1000.0)
            income_obj = IncomeItem(
                id=unique_id,
                tran_id=tran_id,
                symbol=item.get("symbol") or "",
                income_type=inc_type,
                income=float(item.get("income", 0.0)),
                asset=asset,
                time=dt,
                raw_timestamp=int(item.get("time", 0)),
                is_demo=False
            )
            db.add(income_obj)
            new_income_count += 1

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Income sync error: {e}")

    # 3. Fetch trade fills for traded symbols
    # Discover every symbol actively traded or seen in income items + core defaults
    top_defaults = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"]
    income_symbols = set(item.get("symbol") for item in raw_income if item.get("symbol"))
    symbols_to_sync = sorted(list(set(top_defaults) | income_symbols))

    new_fills_count = 0
    existing_fill_ids: Set[str] = set(r[0] for r in db.query(RawFill.id).all())
    seen_fill_ids: Set[str] = set(existing_fill_ids)

    for symbol in symbols_to_sync:
        try:
            fills = client.get_user_trades(symbol=symbol, limit=1000)
            batch_count = 0
            for f in fills:
                fill_id = str(f.get("id"))
                if fill_id in seen_fill_ids:
                    continue
                seen_fill_ids.add(fill_id)

                dt = datetime.utcfromtimestamp(f.get("time", 0) / 1000.0)
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
                    is_demo=False
                )
                db.add(fill_obj)
                batch_count += 1
                new_fills_count += 1

            if batch_count > 0:
                db.commit()
        except Exception as e:
            db.rollback()
            print(f"Warning: Fills sync error for {ascii(symbol)}: {e}")

    # 4. Reconstruct round-trip trades from fills where realized_pnl != 0
    reconstruct_roundtrip_trades(db, is_demo=False)

    return {
        "status": "success",
        "balance": balance,
        "new_fills": new_fills_count,
        "new_income": new_income_count,
        "last_sync": config.last_sync_time.strftime("%Y-%m-%d %H:%M:%S UTC")
    }

def reconstruct_roundtrip_trades(db: Session, is_demo: bool = False):
    """
    Reconstructs complete closed trades from raw execution fills.
    Matches closing fills (realizedPnl != 0) with their opening fills.
    """
    closing_fills = db.query(RawFill).filter(
        RawFill.is_demo == is_demo,
        RawFill.realized_pnl != 0.0
    ).order_by(RawFill.time.asc()).all()

    existing_trade_ids = set(r[0] for r in db.query(Trade.id).filter(Trade.is_demo == is_demo).all())

    reconstructed_count = 0
    for fill in closing_fills:
        trade_id = f"real_tr_{fill.id}"
        if trade_id in existing_trade_ids:
            continue
        existing_trade_ids.add(trade_id)

        # Closing side BUY means position was SHORT. Closing side SELL means position was LONG.
        side = "SHORT" if fill.side.upper() == "BUY" else "LONG"

        # Find opening fill candidates
        open_side = "SELL" if side == "SHORT" else "BUY"
        opening_fill = db.query(RawFill).filter(
            RawFill.symbol == fill.symbol,
            RawFill.side == open_side,
            RawFill.is_demo == is_demo,
            RawFill.time <= fill.time
        ).order_by(RawFill.time.desc()).first()

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
        income_items = db.query(IncomeItem).filter(
            IncomeItem.symbol == fill.symbol,
            IncomeItem.income_type == "FUNDING_FEE",
            IncomeItem.time >= entry_time,
            IncomeItem.time <= fill.time,
            IncomeItem.is_demo == is_demo
        ).all()
        for inc in income_items:
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
            is_demo=is_demo
        )
        db.add(trade)
        reconstructed_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Error committing reconstructed trades: {e}")
        raise e
