from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_security_headers_on_public_endpoint(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "permissions-policy" in response.headers
    assert "camera" in response.headers.get("permissions-policy", "")
    assert response.headers.get("x-request-id") is not None


@pytest.mark.asyncio
async def test_security_headers_on_error() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"


@pytest.mark.asyncio
async def test_no_hsts_in_development(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    assert "strict-transport-security" not in response.headers


@pytest.mark.asyncio
async def test_health_does_not_leak_secrets(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    body = response.text.lower()
    assert "password" not in body
    assert "secret" not in body
    assert "token" not in body
    assert "key" not in body


@pytest.mark.asyncio
async def test_ready_does_not_leak_internal_details(client: AsyncClient) -> None:
    response = await client.get("/health/ready")
    body = response.text.lower()
    assert "url" not in body
    assert "host" not in body or "host" in ["localhost"] and "host" in body
    assert "bucket" not in body
    assert "secret" not in body
    assert "token" not in body
