"""
Database connection and session initialization.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "trading_analysis.db")
DATABASE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for FastAPI route handlers."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    """Create all database tables if they do not exist and ensure schema compatibility."""
    import backend.database.models  # ensure models are registered
    # Verify if income_items table has 'id' column; if not, recreate it cleanly
    with engine.connect() as conn:
        cursor = conn.exec_driver_sql("PRAGMA table_info(income_items)")
        columns = [row[1] for row in cursor.fetchall()]
        if columns and "id" not in columns:
            conn.exec_driver_sql("DROP TABLE income_items")
            conn.commit()

    Base.metadata.create_all(bind=engine)

    # Safe non-destructive column additions for existing databases
    with engine.connect() as conn:
        # 1. account_config.active_account_id
        cfg_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(account_config)").fetchall()]
        if "active_account_id" not in cfg_cols:
            conn.exec_driver_sql("ALTER TABLE account_config ADD COLUMN active_account_id INTEGER")
            conn.commit()

        # 2. trades.account_id
        trade_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(trades)").fetchall()]
        if "account_id" not in trade_cols:
            conn.exec_driver_sql("ALTER TABLE trades ADD COLUMN account_id INTEGER")
            conn.commit()

        # 3. raw_fills.account_id
        fill_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(raw_fills)").fetchall()]
        if "account_id" not in fill_cols:
            conn.exec_driver_sql("ALTER TABLE raw_fills ADD COLUMN account_id INTEGER")
            conn.commit()

        # 4. income_items.account_id
        inc_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(income_items)").fetchall()]
        if "account_id" not in inc_cols:
            conn.exec_driver_sql("ALTER TABLE income_items ADD COLUMN account_id INTEGER")
            conn.commit()

    # 5. Migrate any existing credentials into Account model
    db = SessionLocal()
    try:
        from backend.database.models import Account, AccountConfig, Trade, RawFill, IncomeItem
        accounts_count = db.query(Account).count()
        cfg = db.query(AccountConfig).first()
        if accounts_count == 0:
            default_acc = Account(
                name="Main Account",
                api_key_masked=cfg.api_key_masked if cfg else None,
                api_key_enc=cfg.api_key_enc if cfg else None,
                api_secret_enc=cfg.api_secret_enc if cfg else None,
                is_connected=cfg.is_connected if cfg else False,
                is_active=True,
                account_balance=cfg.account_balance if cfg else 10000.0,
                unrealized_pnl=cfg.unrealized_pnl if cfg else 0.0,
                last_sync_time=cfg.last_sync_time if cfg else None
            )
            db.add(default_acc)
            db.commit()
            db.refresh(default_acc)

            if cfg:
                cfg.active_account_id = default_acc.id
                db.commit()

            # Associate any existing live trades with this account
            db.query(Trade).filter(Trade.is_demo == False, Trade.account_id == None).update(
                {Trade.account_id: default_acc.id}, synchronize_session=False
            )
            db.query(RawFill).filter(RawFill.is_demo == False, RawFill.account_id == None).update(
                {RawFill.account_id: default_acc.id}, synchronize_session=False
            )
            db.query(IncomeItem).filter(IncomeItem.is_demo == False, IncomeItem.account_id == None).update(
                {IncomeItem.account_id: default_acc.id}, synchronize_session=False
            )
            db.commit()
        else:
            first_acc = db.query(Account).first()
            if first_acc:
                db.query(Trade).filter(Trade.is_demo == False, Trade.account_id == None).update(
                    {Trade.account_id: first_acc.id}, synchronize_session=False
                )
                db.query(RawFill).filter(RawFill.is_demo == False, RawFill.account_id == None).update(
                    {RawFill.account_id: first_acc.id}, synchronize_session=False
                )
                db.query(IncomeItem).filter(IncomeItem.is_demo == False, IncomeItem.account_id == None).update(
                    {IncomeItem.account_id: first_acc.id}, synchronize_session=False
                )
                db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning during account migration: {e}")
    finally:
        db.close()


