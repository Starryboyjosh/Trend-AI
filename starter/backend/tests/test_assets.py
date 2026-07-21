from __future__ import annotations

import io

import pytest
from httpx import AsyncClient

WORKSPACE_ID = "ws_test_001"


@pytest.mark.asyncio
async def test_upload_and_list_asset(client: AsyncClient) -> None:
    file_content = io.BytesIO(b"\x89PNG\r\n\x1a\nvalid-image")
    files = {"file": ("test.png", file_content, "image/png")}

    init_resp = await client.post(
        "/api/v1/assets/uploads",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert init_resp.status_code == 200
    upload_id = init_resp.json()["upload_id"]

    complete_resp = await client.post(
        f"/api/v1/assets/uploads/{upload_id}/complete",
        files=files,
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()
    assert data["status"] == "ok"
    assert "asset_id" in data
    assert data["original_name"] == "test.png"

    list_resp = await client.get(
        "/api/v1/assets",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert list_resp.status_code == 200
    assets = list_resp.json()
    assert len(assets) >= 1
    assert any(a["id"] == data["asset_id"] for a in assets)


@pytest.mark.asyncio
async def test_upload_rejects_invalid_mime(client: AsyncClient) -> None:
    file_content = io.BytesIO(b"fake_content")
    files = {"file": ("test.txt", file_content, "text/plain")}

    init_resp = await client.post(
        "/api/v1/assets/uploads",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    upload_id = init_resp.json()["upload_id"]

    complete_resp = await client.post(
        f"/api/v1/assets/uploads/{upload_id}/complete",
        files=files,
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert complete_resp.status_code == 422
    assert complete_resp.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_get_asset(client: AsyncClient) -> None:
    file_content = io.BytesIO(b"\x89PNG\r\n\x1a\nvalid-image")
    files = {"file": ("photo.png", file_content, "image/png")}

    init_resp = await client.post(
        "/api/v1/assets/uploads",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    upload_id = init_resp.json()["upload_id"]

    complete_resp = await client.post(
        f"/api/v1/assets/uploads/{upload_id}/complete",
        files=files,
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    asset_id = complete_resp.json()["asset_id"]

    resp = await client.get(
        f"/api/v1/assets/{asset_id}",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == asset_id


@pytest.mark.asyncio
async def test_analyze_asset(client: AsyncClient) -> None:
    file_content = io.BytesIO(b"\x89PNG\r\n\x1a\nvalid-image")
    files = {"file": ("design.png", file_content, "image/png")}

    init_resp = await client.post(
        "/api/v1/assets/uploads",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    upload_id = init_resp.json()["upload_id"]

    complete_resp = await client.post(
        f"/api/v1/assets/uploads/{upload_id}/complete",
        files=files,
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    asset_id = complete_resp.json()["asset_id"]

    resp = await client.post(
        f"/api/v1/assets/{asset_id}/analyses",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["asset_id"] == asset_id
    assert "summary" in data
    assert len(data["strengths"]) >= 1
    assert len(data["improvements"]) >= 1
    assert len(data["accessibility_notes"]) >= 1


@pytest.mark.asyncio
async def test_analyze_nonexistent_asset(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/assets/nonexistent/analyses",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 404
