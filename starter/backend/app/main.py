from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.business.routes import router as business_router
from app.core.config import settings
from app.core.errors import AppError, app_error_handler
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.database_url.startswith("sqlite"):
        from sqlalchemy import create_engine

        import app.business.models  # noqa: F401
        import app.identity.models  # noqa: F401
        from app.db.base import Base

        engine = create_engine(
            settings.database_url.replace("+aiosqlite", "").replace("+psycopg", "")
        )
        Base.metadata.create_all(engine)
        engine.dispose()
    else:
        await init_db()
    yield


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


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready"}
