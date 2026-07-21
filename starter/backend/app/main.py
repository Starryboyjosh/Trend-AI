from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.business.routes import router as business_router
from app.conversations.routes import router as conversation_router
from app.core.config import settings
from app.core.errors import AppError, app_error_handler
from app.db.session import get_session_factory, init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    if settings.is_demo:
        await _seed_demo_workspace()
    yield


async def _seed_demo_workspace() -> None:
    from sqlalchemy import select

    from app.identity.models import Workspace

    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(select(Workspace).where(Workspace.id == "ws_demo_001"))
        if result.scalar_one_or_none() is None:
            session.add(Workspace(id="ws_demo_001", name="Demo"))
            await session.commit()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)

app.include_router(business_router, prefix=settings.api_prefix)
app.include_router(conversation_router, prefix=settings.api_prefix)


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready"}
