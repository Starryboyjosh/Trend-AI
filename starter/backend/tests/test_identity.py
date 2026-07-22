from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_private_routes_fail_closed_without_session() -> None:
    from httpx import ASGITransport

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as anonymous:
        response = await anonymous.get("/api/v1/businesses")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


@pytest.mark.asyncio
async def test_session_cannot_select_unowned_workspace(client: AsyncClient) -> None:
    response = await client.get("/api/v1/businesses", headers={"X-Workspace-Id": "ws_not_a_member"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_logout_invalidates_the_session(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    response = await client.get("/api/v1/businesses")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_rotates_existing_sessions_and_sets_a_strict_cookie(
    client: AsyncClient,
) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "rotation@example.com",
            "name": "Rotation Test",
            "password": "una-clave-segura-123",
            "workspace_name": "Rotation workspace",
        },
    )
    assert register.status_code == 201
    stale_token = register.cookies.get(settings.session_cookie_name)
    assert stale_token
    set_cookie = register.headers["set-cookie"].casefold()
    assert "httponly" in set_cookie
    assert "samesite=strict" in set_cookie

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "rotation@example.com", "password": "una-clave-segura-123"},
    )
    assert login.status_code == 200
    assert login.cookies.get(settings.session_cookie_name) != stale_token

    from httpx import ASGITransport

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as stale:
        stale.cookies.set(settings.session_cookie_name, stale_token)
        response = await stale.get("/api/v1/auth/me")
    assert response.status_code == 401
