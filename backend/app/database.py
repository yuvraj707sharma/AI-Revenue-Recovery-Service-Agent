import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.config import settings

logger = logging.getLogger("recovery_agent.database")

Base = declarative_base()

db_url = settings.DATABASE_URL
if db_url.startswith("mysql://"):
    db_url = db_url.replace("mysql://", "mysql+aiomysql://")
elif db_url.startswith("sqlite://") and not db_url.startswith("sqlite+aiosqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://")

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

MYSQL_SCHEMA_DDL = """
CREATE TABLE IF NOT EXISTS recovery_events (
  event_id VARCHAR(36) PRIMARY KEY,
  customer_ref VARCHAR(50),
  detected_at DATETIME,
  root_cause VARCHAR(50),
  ground_truth_cause VARCHAR(50),
  decision_reasoning TEXT,
  action_taken VARCHAR(50),
  tier_used TINYINT,
  idempotency_key VARCHAR(80),
  bounded_by_rule VARCHAR(100),
  outcome VARCHAR(20),
  amount_attempted DECIMAL(10,2),
  amount_recovered DECIMAL(10,2),
  timestamp DATETIME
);
"""

async def init_db():
    """Initializes the database and ensures recovery_events table exists with required schema."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables initialized successfully via ORM metadata.")
    except Exception as e:
        logger.error(f"Error initializing DB via metadata: {e}")
        try:
            async with engine.begin() as conn:
                await conn.execute(text(MYSQL_SCHEMA_DDL))
                logger.info("Created recovery_events table via direct DDL.")
        except Exception as ddl_err:
            logger.error(f"DDL fallback error: {ddl_err}")

async def get_db():
    """Dependency for obtaining async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
