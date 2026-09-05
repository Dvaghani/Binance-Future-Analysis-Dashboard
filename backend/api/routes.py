"""
FastAPI REST API Routes for Binance Futures Trading Analysis.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import Account, AccountConfig, Trade, RawFill, IncomeItem
from backend.binance.client import BinanceFuturesClient
from backend.binance.sync import sync_binance_data
from backend.analytics.demo_data import generate_demo_trades, generate_demo_income_items
from backend.analytics.engine import (
    calculate_kpis,
    calculate_equity_curve,
    calculate_long_short_performance,
    calculate_asset_performance,
    calculate_time_analysis,
    calculate_behavioral_patterns,
    calculate_risk_analysis,
    calculate_fees_and_funding,
    calculate_market_regimes,
    calculate_calendar,
    calculate_performance_comparison,
    calculate_winner_loser_stats,
    generate_full_report
)
from backend.analytics.chart_engine import get_trade_chart_data

router = APIRouter(prefix="/api")

# Pydantic Schemas
class CredentialsRequest(BaseModel):
    api_key: str
    api_secret: str

class CreateAccountRequest(BaseModel):
    name: str = "Main Account"
    api_key: str
    api_secret: str
    lookback_days: Optional[int] = 30

class UpdateAccountRequest(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None

class ToggleModeRequest(BaseModel):
    is_demo_mode: bool

# Helpers for Multi-Account and Config
def get_config(db: Session) -> AccountConfig:
    cfg = db.query(AccountConfig).first()
    if not cfg:
        cfg = AccountConfig(
            is_connected=False,
            is_demo_mode=True,
            account_balance=12450.0,
            unrealized_pnl=42.50
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

def get_active_account(db: Session, cfg: AccountConfig) -> Optional[Account]:
    if cfg.active_account_id is not None and cfg.active_account_id > 0:
        acc = db.query(Account).filter(Account.id == cfg.active_account_id).first()
        if acc:
            return acc
    if cfg.active_account_id == 0:
        # Explicitly "All Live Accounts"
        return None
    acc = db.query(Account).filter(Account.is_active == True).first()
    if not acc:
        acc = db.query(Account).first()
    return acc

def get_account_financials(db: Session, cfg: AccountConfig, active_acc: Optional[Account]) -> Tuple[float, float, float]:
    """Returns (balance, unrealized_pnl, equity) respecting demo mode and multi-account aggregation."""
    if cfg.is_demo_mode:
        bal = cfg.account_balance or 12450.0
        unreal = cfg.unrealized_pnl or 42.50
        return round(bal, 2), round(unreal, 2), round(bal + unreal, 2)

    if active_acc:
        bal = active_acc.account_balance or 0.0
        unreal = active_acc.unrealized_pnl or 0.0
        return round(bal, 2), round(unreal, 2), round(bal + unreal, 2)

    # Aggregated "All Accounts" view
    accounts = db.query(Account).filter(Account.is_connected == True).all()
    if not accounts:
        accounts = db.query(Account).all()
    if accounts:
        bal = sum(a.account_balance or 0.0 for a in accounts)
        unreal = sum(a.unrealized_pnl or 0.0 for a in accounts)
        return round(bal, 2), round(unreal, 2), round(bal + unreal, 2)

    bal = cfg.account_balance or 10000.0
    unreal = cfg.unrealized_pnl or 0.0
    return round(bal, 2), round(unreal, 2), round(bal + unreal, 2)

def get_active_trades(db: Session, is_demo: bool, account_id: Optional[int] = None) -> List[Trade]:
    q = db.query(Trade).filter(Trade.is_demo == is_demo)
    if not is_demo and account_id is not None and account_id > 0:
        q = q.filter(Trade.account_id == account_id)
    return q.order_by(Trade.exit_time.desc()).all()


# 1. Status, Mode, & Accounts
@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    active_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    active_name = active_acc.name if active_acc else ("All Live Accounts" if active_id == 0 else "Main Account")

    balance, unrealized, equity = get_account_financials(db, cfg, active_acc)

    demo_trades_count = db.query(Trade).filter(Trade.is_demo == True).count()
    live_trades_q = db.query(Trade).filter(Trade.is_demo == False)
    if active_acc:
        live_trades_q = live_trades_q.filter(Trade.account_id == active_acc.id)
    live_trades_count = live_trades_q.count()

    accounts = db.query(Account).order_by(Account.id.asc()).all()
    accounts_data = []
    for a in accounts:
        acc_trades = db.query(Trade).filter(
            Trade.is_demo == False,
            Trade.account_id == a.id
        ).count()
        accounts_data.append({
            "id": a.id,
            "name": a.name,
            "api_key_masked": a.api_key_masked or "None",
            "is_connected": a.is_connected,
            "is_active": (a.id == active_id),
            "account_balance": round(a.account_balance or 0.0, 2),
            "unrealized_pnl": round(a.unrealized_pnl or 0.0, 2),
            "equity": round((a.account_balance or 0.0) + (a.unrealized_pnl or 0.0), 2),
            "last_sync_time": a.last_sync_time.strftime("%Y-%m-%dT%H:%M:%SZ") if a.last_sync_time else None,
            "live_trades_count": acc_trades
        })

    last_sync = None
    if active_acc and active_acc.last_sync_time:
        last_sync = active_acc.last_sync_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    elif accounts:
        latest_acc = max((a for a in accounts if a.last_sync_time), key=lambda x: x.last_sync_time, default=None)
        if latest_acc and latest_acc.last_sync_time:
            last_sync = latest_acc.last_sync_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    if not last_sync and cfg.last_sync_time:
        last_sync = cfg.last_sync_time.strftime("%Y-%m-%dT%H:%M:%SZ")

    any_connected = any(a.is_connected for a in accounts) or cfg.is_connected

    return {
        "is_demo_mode": cfg.is_demo_mode,
        "is_connected": bool(active_acc.is_connected) if active_acc else any_connected,
        "active_account_id": active_id,
        "active_account_name": active_name,
        "api_key_masked": active_acc.api_key_masked if active_acc else ("All Accounts" if active_id == 0 else (cfg.api_key_masked or "None")),
        "last_sync_time": last_sync,
        "account_balance": balance,
        "unrealized_pnl": unrealized,
        "equity": equity,
        "demo_trades_count": demo_trades_count,
        "live_trades_count": live_trades_count,
        "accounts": accounts_data
    }

@router.get("/accounts")
def list_accounts(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    active_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    accounts = db.query(Account).order_by(Account.id.asc()).all()
    res = []
    for a in accounts:
        count = db.query(Trade).filter(Trade.is_demo == False, Trade.account_id == a.id).count()
        res.append({
            "id": a.id,
            "name": a.name,
            "api_key_masked": a.api_key_masked or "None",
            "is_connected": a.is_connected,
            "is_active": (a.id == active_id),
            "account_balance": round(a.account_balance or 0.0, 2),
            "unrealized_pnl": round(a.unrealized_pnl or 0.0, 2),
            "equity": round((a.account_balance or 0.0) + (a.unrealized_pnl or 0.0), 2),
            "last_sync_time": a.last_sync_time.strftime("%Y-%m-%dT%H:%M:%SZ") if a.last_sync_time else None,
            "live_trades_count": count
        })
    return {
        "accounts": res,
        "active_account_id": active_id,
        "active_account_name": active_acc.name if active_acc else ("All Live Accounts" if active_id == 0 else "Main Account")
    }

@router.post("/accounts")
def create_account(payload: CreateAccountRequest, db: Session = Depends(get_db)):
    if not payload.api_key or not payload.api_key.strip() or not payload.api_secret or not payload.api_secret.strip():
        raise HTTPException(status_code=400, detail="API Key and API Secret are required and cannot be empty.")
    try:
        client = BinanceFuturesClient(payload.api_key, payload.api_secret)
        info = client.test_connection()

        masked = f"{payload.api_key[:4]}...{payload.api_key[-4:]}"
        balance = info.get("totalWalletBalance", 10000.0)
        unrealized = info.get("totalUnrealizedProfit", 0.0)

        # Deactivate previous accounts
        db.query(Account).update({Account.is_active: False})

        new_acc = Account(
            name=payload.name.strip() or "Binance Account",
            api_key_masked=masked,
            api_key_enc=payload.api_key.strip(),
            api_secret_enc=payload.api_secret.strip(),
            is_connected=True,
            is_active=True,
            account_balance=balance,
            unrealized_pnl=unrealized,
            last_sync_time=datetime.now(timezone.utc)
        )
        db.add(new_acc)
        db.commit()
        db.refresh(new_acc)

        cfg = get_config(db)
        cfg.active_account_id = new_acc.id
        cfg.is_demo_mode = False
        cfg.is_connected = True
        cfg.api_key_masked = masked
        cfg.account_balance = balance
        cfg.unrealized_pnl = unrealized
        cfg.last_sync_time = new_acc.last_sync_time
        db.commit()

        # Immediate sync for this newly created account
        try:
            lookback = payload.lookback_days or 30
            sync_binance_data(db, new_acc.api_key_enc, new_acc.api_secret_enc, account_id=new_acc.id, lookback_days=lookback)
        except Exception as sync_err:
            print(f"Warning: Initial sync on account creation had error: {sync_err}")

        return {
            "status": "success",
            "message": f"Account '{new_acc.name}' added and verified successfully.",
            "account_id": new_acc.id,
            "balance": round(new_acc.account_balance or 0.0, 2),
            "account": {
                "id": new_acc.id,
                "name": new_acc.name,
                "api_key_masked": new_acc.api_key_masked,
                "account_balance": round(new_acc.account_balance or 0.0, 2),
                "is_active": True
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/accounts/{account_id}")
def update_account(account_id: int, payload: UpdateAccountRequest, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    if payload.name:
        acc.name = payload.name.strip()
    if payload.api_key and payload.api_secret:
        try:
            client = BinanceFuturesClient(payload.api_key.strip(), payload.api_secret.strip())
            info = client.test_connection()
            acc.api_key_masked = f"{payload.api_key[:4]}...{payload.api_key[-4:]}"
            acc.api_key_enc = payload.api_key.strip()
            acc.api_secret_enc = payload.api_secret.strip()
            acc.account_balance = info.get("totalWalletBalance", acc.account_balance)
            acc.unrealized_pnl = info.get("totalUnrealizedProfit", acc.unrealized_pnl)
            acc.is_connected = True
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid credentials: {str(e)}")

    acc.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "success", "message": "Account updated successfully"}

@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    # Delete related live records
    db.query(Trade).filter(Trade.account_id == account_id).delete()
    db.query(RawFill).filter(RawFill.account_id == account_id).delete()
    db.query(IncomeItem).filter(IncomeItem.account_id == account_id).delete()
    db.delete(acc)

    cfg = get_config(db)
    if cfg.active_account_id == account_id:
        remaining = db.query(Account).first()
        cfg.active_account_id = remaining.id if remaining else None
        if remaining:
            remaining.is_active = True
        else:
            cfg.is_demo_mode = True

    db.commit()
    return {"status": "success", "message": "Account and associated data removed"}

@router.post("/accounts/{account_id}/activate")
def activate_account(account_id: int, db: Session = Depends(get_db)):
    cfg = get_config(db)
    if account_id == 0 or account_id == -1:
        db.query(Account).update({Account.is_active: False})
        cfg.active_account_id = 0
        cfg.is_demo_mode = False
        db.commit()
        return {"status": "success", "active_account_id": 0, "active_account_name": "All Live Accounts"}

    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    db.query(Account).update({Account.is_active: False})
    acc.is_active = True

    cfg.active_account_id = acc.id
    cfg.is_demo_mode = False
    cfg.api_key_masked = acc.api_key_masked
    cfg.account_balance = acc.account_balance
    cfg.unrealized_pnl = acc.unrealized_pnl
    cfg.last_sync_time = acc.last_sync_time
    db.commit()

    return {"status": "success", "active_account_id": acc.id, "active_account_name": acc.name}

@router.post("/accounts/{account_id}/sync")
def sync_account_endpoint(account_id: int, days: int = 30, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    if not acc.api_key_enc or not acc.api_secret_enc:
        raise HTTPException(status_code=400, detail="API credentials are not configured for this account.")

    try:
        res = sync_binance_data(db, acc.api_key_enc, acc.api_secret_enc, account_id=acc.id, lookback_days=days)
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")

@router.post("/accounts/sync-all")
def sync_all_accounts_endpoint(days: int = 30, db: Session = Depends(get_db)):
    accounts = db.query(Account).filter(Account.is_connected == True).all()
    if not accounts:
        accounts = [a for a in db.query(Account).all() if a.api_key_enc and a.api_secret_enc]
    if not accounts:
        raise HTTPException(status_code=400, detail="No accounts configured with API credentials to sync.")

    total_new_fills = 0
    total_new_income = 0
    details = []
    errors = []

    for acc in accounts:
        if not acc.api_key_enc or not acc.api_secret_enc:
            continue
        try:
            res = sync_binance_data(db, acc.api_key_enc, acc.api_secret_enc, account_id=acc.id, lookback_days=days)
            total_new_fills += res.get("new_fills", 0)
            total_new_income += res.get("new_income", 0)
            details.append({
                "account_id": acc.id,
                "name": acc.name,
                "status": "success",
                "balance": res.get("balance"),
                "new_fills": res.get("new_fills", 0),
                "new_income": res.get("new_income", 0)
            })
        except Exception as err:
            db.rollback()
            errors.append(f"{acc.name}: {str(err)}")
            details.append({
                "account_id": acc.id,
                "name": acc.name,
                "status": "error",
                "error": str(err)
            })

    return {
        "status": "success" if not errors else ("partial_success" if total_new_fills > 0 or len(details) > len(errors) else "error"),
        "total_new_fills": total_new_fills,
        "total_new_income": total_new_income,
        "synced_accounts": len([d for d in details if d["status"] == "success"]),
        "details": details,
        "errors": errors
    }

@router.get("/ip")
def get_public_ip():
    import httpx
    try:
        ip = httpx.get("https://api.ipify.org", timeout=4.0).text.strip()
        return {"ip": ip, "status": "success"}
    except Exception:
        return {"ip": "92.206.196.95", "status": "fallback"}

@router.post("/mode/toggle")
def toggle_mode(payload: ToggleModeRequest, db: Session = Depends(get_db)):
    cfg = get_config(db)
    cfg.is_demo_mode = payload.is_demo_mode
    db.commit()
    return {"is_demo_mode": cfg.is_demo_mode, "active_account_id": cfg.active_account_id}

@router.post("/connection/test")
def test_connection_endpoint(payload: CredentialsRequest):
    if not payload.api_key or not payload.api_key.strip() or not payload.api_secret or not payload.api_secret.strip():
        raise HTTPException(status_code=400, detail="API Key and API Secret are required and cannot be empty.")
    try:
        client = BinanceFuturesClient(payload.api_key, payload.api_secret)
        res = client.test_connection()
        return {
            "status": "success",
            "message": "Connected successfully to Binance Futures in READ-ONLY mode.",
            "details": res
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/connection/save")
def save_connection(payload: CredentialsRequest, db: Session = Depends(get_db)):
    if not payload.api_key or not payload.api_key.strip() or not payload.api_secret or not payload.api_secret.strip():
        raise HTTPException(status_code=400, detail="API Key and API Secret are required and cannot be empty.")
    try:
        client = BinanceFuturesClient(payload.api_key, payload.api_secret)
        info = client.test_connection()

        cfg = get_config(db)
        masked = f"{payload.api_key[:4]}...{payload.api_key[-4:]}"
        balance = info.get("totalWalletBalance", 10000.0)
        unrealized = info.get("totalUnrealizedProfit", 0.0)

        # Update or create Account
        active_acc = get_active_account(db, cfg)
        if not active_acc:
            active_acc = Account(
                name="Main Account",
                api_key_masked=masked,
                api_key_enc=payload.api_key.strip(),
                api_secret_enc=payload.api_secret.strip(),
                is_connected=True,
                is_active=True,
                account_balance=balance,
                unrealized_pnl=unrealized,
                last_sync_time=datetime.now(timezone.utc)
            )
            db.add(active_acc)
            db.commit()
            db.refresh(active_acc)
        else:
            active_acc.api_key_masked = masked
            active_acc.api_key_enc = payload.api_key.strip()
            active_acc.api_secret_enc = payload.api_secret.strip()
            active_acc.is_connected = True
            active_acc.account_balance = balance
            active_acc.unrealized_pnl = unrealized
            active_acc.last_sync_time = datetime.now(timezone.utc)
            active_acc.is_active = True

        cfg.active_account_id = active_acc.id
        cfg.api_key_masked = masked
        cfg.api_key_enc = payload.api_key.strip()
        cfg.api_secret_enc = payload.api_secret.strip()
        cfg.is_connected = True
        cfg.account_balance = balance
        cfg.unrealized_pnl = unrealized
        cfg.last_sync_time = active_acc.last_sync_time
        db.commit()

        return {
            "status": "success",
            "message": "Read-only Binance credentials saved and verified.",
            "balance": cfg.account_balance,
            "account_id": active_acc.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sync")
def trigger_sync(days: int = 30, db: Session = Depends(get_db)):
    db.rollback()
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)

    # If in All Accounts mode (cfg.active_account_id == 0 or active_acc is None with not cfg.is_demo_mode)
    if not cfg.is_demo_mode and (cfg.active_account_id == 0 or active_acc is None):
        return sync_all_accounts_endpoint(days=days, db=db)

    api_key = active_acc.api_key_enc if (active_acc and active_acc.api_key_enc) else cfg.api_key_enc
    api_secret = active_acc.api_secret_enc if (active_acc and active_acc.api_secret_enc) else cfg.api_secret_enc
    acc_id = active_acc.id if active_acc else None

    if not api_key or not api_secret:
        raise HTTPException(status_code=400, detail="Binance API credentials are not configured.")
    try:
        res = sync_binance_data(db, api_key, api_secret, account_id=acc_id, lookback_days=days)
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


# 2. Analytics Endpoints (Scoped to Active Account / Demo / All Accounts)
@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    balance, unrealized, equity = get_account_financials(db, cfg, active_acc)

    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    kpis = calculate_kpis(trades, balance, unrealized)
    long_short = calculate_long_short_performance(trades)
    assets = calculate_asset_performance(trades)
    risk = calculate_risk_analysis(trades, balance, unrealized)
    behaviors = calculate_behavioral_patterns(trades)

    return {
        "kpis": kpis,
        "is_demo_mode": cfg.is_demo_mode,
        "active_account_id": acc_id,
        "quick_insight": long_short.get("insight", ""),
        "top_asset": assets.get("top_driver"),
        "top_dragger": assets.get("top_dragger"),
        "risk_score": risk.get("risk_score", 100),
        "risk_tier": risk.get("risk_tier", "Low Risk"),
        "top_behavior": behaviors.get("behaviors", [])[0] if behaviors.get("behaviors") else None
    }

@router.get("/equity-curve")
def get_equity_curve_endpoint(timeframe: str = Query("ALL"), db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    balance, unrealized, equity = get_account_financials(db, cfg, active_acc)

    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    data = calculate_equity_curve(trades, timeframe.upper(), balance, unrealized)
    return {"timeframe": timeframe.upper(), "data": data}

@router.get("/trades")
def get_trades(
    symbol: Optional[str] = None,
    side: Optional[str] = None,
    outcome: Optional[str] = None,
    date: Optional[str] = None,
    search: Optional[str] = None,
    account_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db)
):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)

    query = db.query(Trade).filter(Trade.is_demo == cfg.is_demo_mode)
    if not cfg.is_demo_mode:
        if account_id is not None:
            if account_id > 0:
                query = query.filter(Trade.account_id == account_id)
        elif acc_id is not None and acc_id > 0:
            query = query.filter(Trade.account_id == acc_id)

    if symbol and symbol != "ALL":
        query = query.filter(Trade.symbol == symbol)
    if side and side != "ALL":
        query = query.filter(Trade.side == side.upper())
    if outcome and outcome.strip() and outcome.strip().upper() != "ALL":
        normalized = outcome.strip().upper()
        if normalized in ("WIN", "WINNER", "WINNERS"):
            query = query.filter(Trade.net_pnl > 0)
        elif normalized in ("LOSS", "LOSER", "LOSERS"):
            query = query.filter(Trade.net_pnl <= 0)
    if date and date.strip():
        try:
            d = datetime.strptime(date.strip(), "%Y-%m-%d")
            start_dt = datetime(d.year, d.month, d.day, 0, 0, 0)
            end_dt = datetime(d.year, d.month, d.day, 23, 59, 59, 999999)
            query = query.filter(Trade.exit_time >= start_dt, Trade.exit_time <= end_dt)
        except Exception:
            pass
    if search:
        search_term = search.strip()
        s = f"%{search_term}%"
        date_matched = False
        try:
            d = datetime.strptime(search_term, "%Y-%m-%d")
            start_dt = datetime(d.year, d.month, d.day, 0, 0, 0)
            end_dt = datetime(d.year, d.month, d.day, 23, 59, 59, 999999)
            query = query.filter(
                Trade.symbol.ilike(s) | Trade.notes.ilike(s) | Trade.behavioral_flags.ilike(s) |
                ((Trade.exit_time >= start_dt) & (Trade.exit_time <= end_dt))
            )
            date_matched = True
        except Exception:
            pass
        if not date_matched:
            query = query.filter(Trade.symbol.ilike(s) | Trade.notes.ilike(s) | Trade.behavioral_flags.ilike(s))

    total = query.count()
    items = query.order_by(Trade.exit_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    acc_name_map = {a.id: a.name for a in db.query(Account).all()}
    trades_data = []
    for t in items:
        acc_name = acc_name_map.get(t.account_id, "Main Account") if t.account_id else ("Demo" if t.is_demo else "Main Account")
        trades_data.append({
            "id": t.id,
            "account_id": t.account_id,
            "account_name": acc_name,
            "symbol": t.symbol,
            "side": t.side,
            "entry_time": t.entry_time.strftime("%Y-%m-%d %H:%M"),
            "exit_time": t.exit_time.strftime("%Y-%m-%d %H:%M"),
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "quantity": t.quantity,
            "position_value": t.position_value,
            "leverage": t.leverage,
            "gross_pnl": t.gross_pnl,
            "pnl_percentage": t.pnl_percentage,
            "commission": round(t.commission, 6) if t.commission else 0.0,
            "funding_fees": round(t.funding_fees, 6) if t.funding_fees else 0.0,
            "net_pnl": t.net_pnl,
            "duration_seconds": t.duration_seconds,
            "duration_formatted": f"{t.duration_seconds // 3600}h {(t.duration_seconds % 3600) // 60}m" if t.duration_seconds >= 3600 else f"{t.duration_seconds // 60}m",
            "is_winner": t.is_winner,
            "behavioral_flags": [f.strip() for f in t.behavioral_flags.split(",") if f.strip()],
            "market_regime": t.market_regime,
            "notes": t.notes
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "trades": trades_data
    }

@router.get("/trades/{trade_id}")
def get_single_trade(trade_id: str, db: Session = Depends(get_db)):
    t = db.query(Trade).filter(Trade.id == trade_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trade not found")
    acc_name_map = {a.id: a.name for a in db.query(Account).all()}
    acc_name = acc_name_map.get(t.account_id, "Main Account") if t.account_id else ("Demo" if t.is_demo else "Main Account")
    return {
        "id": t.id,
        "account_id": t.account_id,
        "account_name": acc_name,
        "symbol": t.symbol,
        "side": t.side,
        "entry_time": t.entry_time.isoformat(),
        "exit_time": t.exit_time.isoformat(),
        "entry_price": t.entry_price,
        "exit_price": t.exit_price,
        "quantity": t.quantity,
        "position_value": t.position_value,
        "leverage": t.leverage,
        "gross_pnl": t.gross_pnl,
        "pnl_percentage": t.pnl_percentage,
        "commission": round(t.commission, 6) if t.commission else 0.0,
        "funding_fees": round(t.funding_fees, 6) if t.funding_fees else 0.0,
        "net_pnl": t.net_pnl,
        "duration_seconds": t.duration_seconds,
        "is_winner": t.is_winner,
        "behavioral_flags": [f.strip() for f in t.behavioral_flags.split(",") if f.strip()],
        "market_regime": t.market_regime,
        "notes": t.notes
    }

@router.get("/trades/{trade_id}/chart")
def get_trade_chart_endpoint(
    trade_id: str,
    interval: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    t = db.query(Trade).filter(Trade.id == trade_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trade not found")
    return get_trade_chart_data(t, interval)

@router.get("/traded-symbols")
def get_traded_symbols_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)

    q = db.query(Trade.symbol).filter(Trade.is_demo == cfg.is_demo_mode)
    if not cfg.is_demo_mode and acc_id is not None and acc_id > 0:
        q = q.filter(Trade.account_id == acc_id)
    rows = q.distinct().order_by(Trade.symbol.asc()).all()
    symbols = [r[0] for r in rows if r[0]]
    return {"symbols": symbols}

@router.get("/assets")
def get_assets_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_asset_performance(trades)

@router.get("/long-short")
def get_long_short_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_long_short_performance(trades)

@router.get("/time-analysis")
def get_time_analysis_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_time_analysis(trades)

@router.get("/behavior")
def get_behavior_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_behavioral_patterns(trades)

@router.get("/risk")
def get_risk_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    balance, unrealized, equity = get_account_financials(db, cfg, active_acc)

    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_risk_analysis(trades, balance, unrealized)

@router.get("/fees")
def get_fees_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_fees_and_funding(trades)

@router.get("/performance-comparison")
def get_comparison_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_performance_comparison(trades)

@router.get("/winner-loser")
def get_winner_loser_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return calculate_winner_loser_stats(trades)

@router.get("/market")
def get_market_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return {"regimes": calculate_market_regimes(trades)}

@router.get("/calendar")
def get_calendar_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return {"days": calculate_calendar(trades)}

@router.get("/reports")
def get_report_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    active_acc = get_active_account(db, cfg)
    acc_id = active_acc.id if active_acc else (0 if cfg.active_account_id == 0 else None)
    balance, unrealized, equity = get_account_financials(db, cfg, active_acc)

    trades = get_active_trades(db, cfg.is_demo_mode, acc_id)
    return generate_full_report(trades, balance, unrealized)

@router.post("/demo/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    # Clear existing demo trades and income
    db.query(Trade).filter(Trade.is_demo == True).delete()
    db.query(IncomeItem).filter(IncomeItem.is_demo == True).delete()
    db.commit()

    trades = generate_demo_trades()
    income = generate_demo_income_items(trades)
    for t in trades:
        db.add(t)
    for inc in income:
        db.add(inc)
    db.commit()

    return {"status": "success", "count": len(trades)}
