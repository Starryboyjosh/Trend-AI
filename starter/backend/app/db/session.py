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
_async_session_factory: Any = None


def _ensure_engine():
    global _engine, _async_session_factory
    if _engine is None:
        _engine = create_async_engine(
            _build_url(),
            echo=settings.app_env == "development",
        )
        _async_session_factory = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    _ensure_engine()
    async with _async_session_factory() as session:
        yield session


async def init_db() -> None:
    _ensure_engine()
    import app.business.models  # noqa: F401
    import app.identity.models  # noqa: F401
    from app.db.base import Base

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
