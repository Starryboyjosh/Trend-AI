from __future__ import annotations

import io
from base64 import b64decode

import pytest
from httpx import AsyncClient

WORKSPACE_ID = "ws_test_001"
PNG_1X1 = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC"
)


@pytest.mark.asyncio
async def test_upload_and_list_asset(client: AsyncClient) -> None:
    file_content = io.BytesIO(PNG_1X1)
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
    assert data["mime_type"] == "image/png"

    list_resp = await client.get(
        "/api/v1/assets",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert list_resp.status_code == 200
    assets = list_resp.json()
    assert len(assets) >= 1
    assert any(a["id"] == data["asset_id"] for a in assets)
    stored = next(a for a in assets if a["id"] == data["asset_id"])
    assert stored["width"] == 1
    assert stored["height"] == 1


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
    file_content = io.BytesIO(PNG_1X1)
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

    content_response = await client.get(
        f"/api/v1/assets/{asset_id}/content",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert content_response.status_code == 200
    assert content_response.headers["content-type"] == "image/png"
    assert content_response.content == PNG_1X1

    forbidden_content_response = await client.get(
        f"/api/v1/assets/{asset_id}/content",
        headers={"X-Workspace-Id": "ws_not_a_member"},
    )
    assert forbidden_content_response.status_code == 403


@pytest.mark.asyncio
async def test_analyze_asset(client: AsyncClient) -> None:
    file_content = io.BytesIO(PNG_1X1)
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
async def test_upload_rejects_content_that_does_not_match_declared_image_type(
    client: AsyncClient,
) -> None:
    init_resp = await client.post(
        "/api/v1/assets/uploads", headers={"X-Workspace-Id": WORKSPACE_ID}
    )
    response = await client.post(
        f"/api/v1/assets/uploads/{init_resp.json()['upload_id']}/complete",
        files={"file": ("mismatch.jpg", io.BytesIO(PNG_1X1), "image/jpeg")},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_rejects_malformed_image_with_valid_header(client: AsyncClient) -> None:
    init_resp = await client.post(
        "/api/v1/assets/uploads", headers={"X-Workspace-Id": WORKSPACE_ID}
    )
    malformed_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    response = await client.post(
        f"/api/v1/assets/uploads/{init_resp.json()['upload_id']}/complete",
        files={"file": ("invalid.png", io.BytesIO(malformed_png), "image/png")},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_analyze_nonexistent_asset(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/assets/nonexistent/analyses",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 404
