from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.main import _rate_windows


@pytest.mark.asyncio
async def test_security_headers_and_request_id(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


@pytest.mark.asyncio
async def test_malformed_content_length_returns_safe_error(client: AsyncClient) -> None:
    response = await client.get("/health/live", headers={"Content-Length": "not-a-number"})

    assert response.status_code == 400
    assert response.headers["x-request-id"]
    assert response.json()["error"]["code"] == "INVALID_CONTENT_LENGTH"


@pytest.mark.asyncio
async def test_login_rate_limit_returns_retryable_error(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _rate_windows.clear()
    monkeypatch.setattr(settings, "rate_limit_requests", 1)
    try:
        first = await client.post(
            "/api/v1/auth/login",
            json={"email": "nadie@example.com", "password": "incorrecta"},
        )
        second = await client.post(
            "/api/v1/auth/login",
            json={"email": "nadie@example.com", "password": "incorrecta"},
        )
    finally:
        _rate_windows.clear()

    assert first.status_code in {401, 403}
    assert second.status_code == 429
    assert second.headers["retry-after"]
    assert second.json()["error"]["code"] == "RATE_LIMITED"
