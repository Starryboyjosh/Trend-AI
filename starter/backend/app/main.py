from __future__ import annotations

import logging
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
from app.core.rate_limit import LocalRateLimiter, RateLimiter, RedisRateLimiter
from app.db.session import get_session_factory
from app.identity.routes import router as identity_router
from app.projects.routes import router as project_router
from app.templates.routes import router as template_router

logger = logging.getLogger("hitrendy.http")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings.validate_runtime_configuration()
    if settings.app_env == "production":
        await get_rate_limiter().ensure_available()
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

_RATE_LIMITED_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register"}
_local_rate_limiter = LocalRateLimiter()
# Kept as a test-only inspection point while development uses the local adapter.
_rate_windows = _local_rate_limiter.windows
_rate_limiter: RateLimiter | None = None
_rate_limiter_url: str | None = None


def _requires_rate_limit(path: str) -> bool:
    return (
        path in _RATE_LIMITED_PATHS
        or path.endswith("/messages")
        or path.endswith("/variations")
        or path.endswith("/analyses")
    )


def get_rate_limiter() -> RateLimiter:
    global _rate_limiter, _rate_limiter_url
    if settings.app_env != "production":
        return _local_rate_limiter
    if _rate_limiter is None or _rate_limiter_url != settings.redis_url:
        _rate_limiter = RedisRateLimiter.from_url(settings.redis_url)
        _rate_limiter_url = settings.redis_url
    return _rate_limiter


def _record_request(request: Request, request_id: str, status_code: int, started: float) -> None:
    logger.info(
        "http_request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration_ms": round((monotonic() - started) * 1000, 2),
        },
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    started = monotonic()
    request_id = request.headers.get("X-Request-Id") or uuid4().hex
    content_length = request.headers.get("content-length")
    if _requires_rate_limit(request.url.path):
        key = f"hitrendy:rate-limit:{request.client.host if request.client else 'unknown'}:{request.url.path}"
        if not await get_rate_limiter().allow(
            key=key,
            limit=settings.rate_limit_requests,
            window_seconds=settings.rate_limit_window_seconds,
        ):
            limited_response = JSONResponse(
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
            _record_request(request, request_id, limited_response.status_code, started)
            return limited_response
    if content_length:
        try:
            requested_bytes = int(content_length)
        except ValueError:
            invalid_length_response = JSONResponse(
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
            _record_request(request, request_id, invalid_length_response.status_code, started)
            return invalid_length_response
        if requested_bytes > settings.max_request_body_bytes:
            oversized_response = JSONResponse(
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
            _record_request(request, request_id, oversized_response.status_code, started)
            return oversized_response
    try:
        response = await call_next(request)
    except Exception:
        logger.error(
            "http_request_failed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": round((monotonic() - started) * 1000, 2),
            },
        )
        raise
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
    _record_request(request, request_id, response.status_code, started)
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
