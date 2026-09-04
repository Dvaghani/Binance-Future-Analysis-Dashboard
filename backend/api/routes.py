"""
FastAPI REST API Routes for Binance Futures Trading Analysis.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import AccountConfig, Trade
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

router = APIRouter(prefix="/api")

# Pydantic Schemas
class CredentialsRequest(BaseModel):
    api_key: str
    api_secret: str

class ToggleModeRequest(BaseModel):
    is_demo_mode: bool

# Helper to get active trades (Demo vs Live)
def get_active_trades(db: Session, is_demo: bool) -> List[Trade]:
    return db.query(Trade).filter(Trade.is_demo == is_demo).order_by(Trade.exit_time.desc()).all()

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

# 1. Status & Mode
@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    cfg = get_config(db)
    demo_trades_count = db.query(Trade).filter(Trade.is_demo == True).count()
    live_trades_count = db.query(Trade).filter(Trade.is_demo == False).count()

    equity = round(cfg.account_balance + (cfg.unrealized_pnl or 0.0), 2)
    return {
        "is_demo_mode": cfg.is_demo_mode,
        "is_connected": cfg.is_connected,
        "api_key_masked": cfg.api_key_masked or "None",
        "last_sync_time": (
            cfg.last_sync_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            if cfg.last_sync_time else None
        ),
        "account_balance": cfg.account_balance,
        "unrealized_pnl": cfg.unrealized_pnl,
        "equity": equity,
        "demo_trades_count": demo_trades_count,
        "live_trades_count": live_trades_count
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
    return {"is_demo_mode": cfg.is_demo_mode}

@router.post("/connection/test")
def test_connection_endpoint(payload: CredentialsRequest):
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
    try:
        # Verify first
        client = BinanceFuturesClient(payload.api_key, payload.api_secret)
        info = client.test_connection()

        cfg = get_config(db)
        cfg.api_key_masked = f"{payload.api_key[:4]}...{payload.api_key[-4:]}"
        # Store locally in DB
        cfg.api_key_enc = payload.api_key
        cfg.api_secret_enc = payload.api_secret
        cfg.is_connected = True
        cfg.account_balance = info.get("totalWalletBalance", 10000.0)
        cfg.unrealized_pnl = info.get("totalUnrealizedProfit", 0.0)
        cfg.last_sync_time = datetime.now(timezone.utc)
        db.commit()

        return {
            "status": "success",
            "message": "Read-only Binance credentials saved and verified.",
            "balance": cfg.account_balance
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sync")
def trigger_sync(db: Session = Depends(get_db)):
    db.rollback()  # Ensure any pending or broken transaction is cleared
    cfg = get_config(db)
    if not cfg.api_key_enc or not cfg.api_secret_enc:
        raise HTTPException(status_code=400, detail="Binance API credentials are not configured.")
    try:
        res = sync_binance_data(db, cfg.api_key_enc, cfg.api_secret_enc)
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")

# 2. Analytics Endpoints
@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    kpis = calculate_kpis(trades, cfg.account_balance, cfg.unrealized_pnl or 0.0)
    long_short = calculate_long_short_performance(trades)
    assets = calculate_asset_performance(trades)
    risk = calculate_risk_analysis(trades, cfg.account_balance)
    behaviors = calculate_behavioral_patterns(trades)

    return {
        "kpis": kpis,
        "is_demo_mode": cfg.is_demo_mode,
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
    trades = get_active_trades(db, cfg.is_demo_mode)
    data = calculate_equity_curve(trades, timeframe.upper(), cfg.account_balance, cfg.unrealized_pnl or 0.0)
    return {"timeframe": timeframe.upper(), "data": data}

@router.get("/trades")
def get_trades(
    symbol: Optional[str] = None,
    side: Optional[str] = None,
    outcome: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db)
):
    cfg = get_config(db)
    query = db.query(Trade).filter(Trade.is_demo == cfg.is_demo_mode)

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
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Trade.symbol.ilike(s) | Trade.notes.ilike(s) | Trade.behavioral_flags.ilike(s))

    total = query.count()
    items = query.order_by(Trade.exit_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    trades_data = []
    for t in items:
        trades_data.append({
            "id": t.id,
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
    return {
        "id": t.id,
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

@router.get("/traded-symbols")
def get_traded_symbols_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    rows = db.query(Trade.symbol).filter(Trade.is_demo == cfg.is_demo_mode).distinct().order_by(Trade.symbol.asc()).all()
    symbols = [r[0] for r in rows if r[0]]
    return {"symbols": symbols}

@router.get("/assets")
def get_assets_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_asset_performance(trades)

@router.get("/long-short")
def get_long_short_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_long_short_performance(trades)

@router.get("/time-analysis")
def get_time_analysis_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_time_analysis(trades)

@router.get("/behavior")
def get_behavior_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_behavioral_patterns(trades)

@router.get("/risk")
def get_risk_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_risk_analysis(trades, cfg.account_balance)

@router.get("/fees")
def get_fees_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_fees_and_funding(trades)

@router.get("/performance-comparison")
def get_comparison_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_performance_comparison(trades)

@router.get("/winner-loser")
def get_winner_loser_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return calculate_winner_loser_stats(trades)

@router.get("/market")
def get_market_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return {"regimes": calculate_market_regimes(trades)}

@router.get("/calendar")
def get_calendar_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return {"days": calculate_calendar(trades)}

@router.get("/reports")
def get_report_endpoint(db: Session = Depends(get_db)):
    cfg = get_config(db)
    trades = get_active_trades(db, cfg.is_demo_mode)
    return generate_full_report(trades, cfg.account_balance)

@router.post("/demo/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    # Clear existing demo trades and income
    db.query(Trade).filter(Trade.is_demo == True).delete()
    db.commit()

    trades = generate_demo_trades()
    for t in trades:
        db.add(t)
    db.commit()

    return {"status": "success", "count": len(trades)}
