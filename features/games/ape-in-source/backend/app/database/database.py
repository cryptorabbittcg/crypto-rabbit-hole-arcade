from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.config import settings

# Create async engine with SQLite concurrency fixes
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True,
    # SQLite concurrency fixes for Render
    connect_args={
        "check_same_thread": False,
        "timeout": 30,  # 30 second timeout for database operations
    } if "sqlite" in settings.DATABASE_URL else {}
)

# Create async session maker with better concurrency handling
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    # Better session management for concurrent access
    autoflush=False,
    autocommit=False
)

# Base class for models
Base = declarative_base()


async def get_db():
    """Dependency for getting database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    try:
        print(f"🔗 Connecting to database: {settings.DATABASE_URL}")
        print(f"🔗 Database URL type: {type(settings.DATABASE_URL)}")
        print(f"🔗 Using SQLite for production due to asyncpg Python 3.13 compatibility issues")
        
        # Test connection first
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"✅ Database connection test passed: {result}")
            
            # Create tables
            await conn.run_sync(Base.metadata.create_all)
            print("✅ Database tables created successfully!")
            
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise






