from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _build_url() -> str:
    url = settings.database_url
    if url.startswith("sqlite:///") and not url.startswith("sqlite+aiosqlite"):
        url = url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return url


_engine: Any = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def ensure_engine():
    global _engine, _session_factory
    if _engine is None:
        _engine = create_async_engine(
            _build_url(),
            echo=settings.app_env == "development",
        )
        _session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    ensure_engine()
    assert _session_factory is not None
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    ensure_engine()
    async with _session_factory() as session:
        yield session
