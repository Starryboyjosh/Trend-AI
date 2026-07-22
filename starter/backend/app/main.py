from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from time import monotonic
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

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

_rate_windows: dict[tuple[str, str], list[float]] = {}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or uuid4().hex
    content_length = request.headers.get("content-length")
    sensitive_paths = {"/api/v1/auth/login", "/api/v1/auth/register"}
    if request.url.path in sensitive_paths or request.url.path.endswith("/messages"):
        key = (request.client.host if request.client else "unknown", request.url.path)
        now = monotonic()
        window = [
            item
            for item in _rate_windows.get(key, [])
            if now - item < settings.rate_limit_window_seconds
        ]
        if len(window) >= settings.rate_limit_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Demasiadas solicitudes. Inténtalo nuevamente en un momento.",
                        "retryable": True,
                    }
                },
                headers={
                    "X-Request-Id": request_id,
                    "Retry-After": str(settings.rate_limit_window_seconds),
                },
            )
        window.append(now)
        _rate_windows[key] = window
    if content_length:
        try:
            requested_bytes = int(content_length)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "INVALID_CONTENT_LENGTH",
                        "message": "El tamaño de la solicitud no es válido.",
                        "retryable": False,
                    }
                },
                headers={"X-Request-Id": request_id},
            )
        if requested_bytes > settings.max_request_body_bytes:
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


@app.get("/health/ready", response_model=None)
async def ready() -> dict[str, object] | JSONResponse:
    """Report readiness only when the application can use its database."""

    try:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "checks": {"database": "unavailable"},
            },
        )
    return {"status": "ok", "checks": {"database": "ok"}}
