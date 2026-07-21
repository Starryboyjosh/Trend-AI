from __future__ import annotations

import pytest
from httpx import AsyncClient


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
