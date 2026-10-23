import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
import tempfile
import os

from app.models import Base


@pytest.fixture(scope="function")
def temp_db_path():
    """Create a temporary database file for each test."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield path
    try:
        os.unlink(path)
    except OSError:
        pass


@pytest.fixture(scope="function")
def engine(temp_db_path):
    return create_async_engine(
        f"sqlite+aiosqlite:///{temp_db_path}",
        echo=False,
        poolclass=NullPool,
        connect_args={"check_same_thread": False},
    )


@pytest.fixture(scope="function")
async def init_db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest_asyncio.fixture
async def session(engine, init_db):
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def doc_service(session):
    from app.services.document_service import DocumentService
    return DocumentService(session)


@pytest_asyncio.fixture
async def inc_service(session):
    from app.services.document_service import IncrementalIndexService
    return IncrementalIndexService(session)