"""
FastAPI Server Entry Point.
Personal Binance Futures Trading Analysis Platform.
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path so 'backend.*' imports succeed regardless of working directory
_ROOT_DIR = str(Path(__file__).resolve().parent.parent)
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.db import init_db, SessionLocal
from backend.database.models import Trade, AccountConfig
from backend.analytics.demo_data import generate_demo_trades, generate_demo_income_items
from backend.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB tables
    init_db()

    # 2. Check if Demo data is seeded
    db = SessionLocal()
    try:
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

        demo_count = db.query(Trade).filter(Trade.is_demo == True).count()
        if demo_count == 0:
            print("[Startup] Seeding realistic 90-day demo trades...")
            demo_trades = generate_demo_trades()
            demo_income = generate_demo_income_items(demo_trades)
            for t in demo_trades:
                db.add(t)
            for inc in demo_income:
                db.add(inc)
            db.commit()
            print(f"[Startup] Successfully seeded {len(demo_trades)} demo trades and {len(demo_income)} income items.")
    finally:
        db.close()

    yield

app = FastAPI(
    title="Personal Binance Futures Trading Intelligence API",
    description="Read-only Binance Futures Analytics & Behavioral Flaw Detection Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite default is 5173 or 3000)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "service": "Binance Futures Trading Intelligence Platform",
        "status": "online",
        "mode": "read-only",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
