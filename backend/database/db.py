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

