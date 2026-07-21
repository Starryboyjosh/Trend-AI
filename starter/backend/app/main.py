from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.assets.routes import router as asset_router
from app.business.routes import router as business_router
from app.conversations.routes import router as conversation_router
from app.core.config import settings
from app.core.errors import AppError, app_error_handler
from app.db.session import get_session_factory
from app.identity.routes import router as identity_router
from app.projects.routes import router as project_router
from app.templates.routes import router as template_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.is_demo:
        await _seed_templates()
    yield


async def _seed_templates() -> None:
    from app.templates.repository import seed_templates

    factory = get_session_factory()
    async with factory() as session:
        await seed_templates(session)


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
app.include_router(identity_router, prefix=settings.api_prefix)
app.include_router(conversation_router, prefix=settings.api_prefix)
app.include_router(project_router, prefix=settings.api_prefix)
app.include_router(asset_router, prefix=settings.api_prefix)
app.include_router(template_router, prefix=settings.api_prefix)


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready"}
