from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.dependencies import get_db
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///./test_hitrendy.db"

_async_engine = create_async_engine(TEST_DB_URL, echo=False)
_TestingSessionFactory = async_sessionmaker(
    _async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

_sync_engine = create_engine("sqlite:///./test_hitrendy.db")


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_sync_engine)
    yield
    Base.metadata.drop_all(bind=_sync_engine)
    _sync_engine.dispose()


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _TestingSessionFactory() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
