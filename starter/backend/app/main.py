from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


@app.middleware("http")
async def security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or uuid4().hex
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.max_request_body_bytes:
        return JSONResponse(
            status_code=413,
            content={
                "error": {
                    "code": "REQUEST_TOO_LARGE",
                    "message": "La solicitud supera el tamaño permitido.",
                    "retryable": False,
                }
            },
            headers={"X-Request-Id": request_id},
        )
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
    return response


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
