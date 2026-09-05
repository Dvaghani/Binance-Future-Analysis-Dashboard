"""
Database models for Binance Futures Trading Analysis.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Index
from backend.database.db import Base

class Account(Base):
    """
    Connected Binance Futures account configurations.
    Allows multiple live accounts (e.g. Main Account, Subaccount, Bot).
    """
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False, default="Main Account")
    api_key_masked = Column(String(64), nullable=True)
    api_key_enc = Column(Text, nullable=True)
    api_secret_enc = Column(Text, nullable=True)
    is_connected = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    account_balance = Column(Float, default=10000.0)
    unrealized_pnl = Column(Float, default=0.0)
    last_sync_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AccountConfig(Base):
    __tablename__ = "account_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    api_key_masked = Column(String(64), nullable=True)
    api_key_enc = Column(Text, nullable=True)
    api_secret_enc = Column(Text, nullable=True)
    is_connected = Column(Boolean, default=False)
    is_demo_mode = Column(Boolean, default=True)
    active_account_id = Column(Integer, nullable=True)
    last_sync_time = Column(DateTime, nullable=True)
    account_balance = Column(Float, default=10000.0)
    unrealized_pnl = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Trade(Base):
    """
    Normalized closed round-trip position or trade.
    """
    __tablename__ = "trades"

    id = Column(String(64), primary_key=True)  # unique trade ID
    symbol = Column(String(32), nullable=False, index=True)  # e.g. BTCUSDT
    side = Column(String(10), nullable=False, index=True)    # LONG or SHORT
    entry_time = Column(DateTime, nullable=False, index=True)
    exit_time = Column(DateTime, nullable=False, index=True)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    position_value = Column(Float, nullable=False)  # entry_price * quantity
    leverage = Column(Integer, default=10)
    
    gross_pnl = Column(Float, nullable=False)
    pnl_percentage = Column(Float, nullable=False)  # (gross_pnl / (position_value / leverage)) * 100
    commission = Column(Float, default=0.0)
    funding_fees = Column(Float, default=0.0)       # Net funding: positive = received, negative = paid
    net_pnl = Column(Float, nullable=False)         # gross_pnl - commission + funding_fees
    
    duration_seconds = Column(Integer, nullable=False) # exit_time - entry_time
    is_winner = Column(Boolean, nullable=False, index=True)
    
    # Behavioral detection flags (JSON or comma separated)
    behavioral_flags = Column(Text, default="")     # e.g. "REVENGE,OVERSIZED"
    market_regime = Column(String(32), default="Sideways") # Strong Bull, Bull, Sideways, Bear, Strong Bear, High Volatility
    notes = Column(Text, default="")
    is_demo = Column(Boolean, default=False, index=True)
    account_id = Column(Integer, nullable=True, index=True)

    __table_args__ = (
        Index("ix_trades_exit_time_demo", "exit_time", "is_demo"),
        Index("ix_trades_symbol_demo", "symbol", "is_demo"),
        Index("ix_trades_account_demo", "account_id", "is_demo"),
    )


class RawFill(Base):
    """
    Raw execution fills from Binance /fapi/v1/userTrades.
    Used for idempotent synchronization and FIFO matching.
    """
    __tablename__ = "raw_fills"

    id = Column(String(64), primary_key=True)  # Binance fill tradeId as string
    symbol = Column(String(32), nullable=False, index=True)
    order_id = Column(String(64), nullable=False)
    side = Column(String(10), nullable=False)  # BUY or SELL
    price = Column(Float, nullable=False)
    qty = Column(Float, nullable=False)
    quote_qty = Column(Float, nullable=False)
    commission = Column(Float, default=0.0)
    commission_asset = Column(String(16), default="USDT")
    realized_pnl = Column(Float, default=0.0)
    time = Column(DateTime, nullable=False, index=True)
    raw_timestamp = Column(Integer, nullable=False)
    is_buyer = Column(Boolean, default=False)
    is_maker = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    account_id = Column(Integer, nullable=True, index=True)


class IncomeItem(Base):
    """
    Funding fee payments, commissions, transfers from /fapi/v1/income.
    """
    __tablename__ = "income_items"

    id = Column(String(128), primary_key=True)
    tran_id = Column(String(64), nullable=False, index=True)
    symbol = Column(String(32), nullable=True, index=True)
    income_type = Column(String(32), nullable=False, index=True) # FUNDING_FEE, COMMISSION, REALIZED_PNL
    income = Column(Float, nullable=False)
    asset = Column(String(16), default="USDT")
    time = Column(DateTime, nullable=False, index=True)
    raw_timestamp = Column(Integer, nullable=False)
    is_demo = Column(Boolean, default=False, index=True)
    account_id = Column(Integer, nullable=True, index=True)

    __table_args__ = (
        Index("ix_income_items_symbol_type_time", "symbol", "income_type", "time"),
        Index("ix_income_items_symbol_income_type", "symbol", "income_type"),
    )
