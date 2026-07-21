from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

BUSINESS_DATA = {
    "name": "Café del Valle",
    "category": "gastronomy",
    "country": "México",
    "city": "Ciudad de México",
    "primary_product": "Café de especialidad",
    "target_audience": "Jóvenes profesionales de 25 a 40 años en CDMX",
    "preferred_platforms": ["instagram", "tiktok"],
    "primary_objective": "reach",
}

BRAND_DATA = {
    "voice_tones": ["friendly", "professional"],
    "value_proposition": "Café artesanal de origen responsable.",
    "preferred_words": ["artesanal", "origen"],
    "forbidden_words": ["barato"],
    "primary_color": "#541787",
    "secondary_color": "#B79CFA",
}

WORKSPACE_ID = "ws_test_001"


@pytest_asyncio.fixture
async def business_id(client: AsyncClient) -> str:
    resp = await client.post(
        "/api/v1/businesses",
        json=BUSINESS_DATA,
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    data = resp.json()
    await client.put(
        f"/api/v1/businesses/{data['id']}/brand-profile",
        json=BRAND_DATA,
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    return data["id"]


@pytest_asyncio.fixture
async def conversation_id(client: AsyncClient, business_id: str) -> str:
    resp = await client.post(
        "/api/v1/conversations",
        json={"business_id": business_id, "title": "Test proyectos"},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    return resp.json()["id"]


@pytest_asyncio.fixture
async def artifact_id(client: AsyncClient, conversation_id: str) -> str:
    msg_resp = await client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json={"text": "Crea un post promocional"},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    data = msg_resp.json()
    assert data["type"] == "artifact"
    assert data["artifact_id"] is not None
    return data["artifact_id"]


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, artifact_id: str) -> None:
    resp = await client.post(
        "/api/v1/projects",
        json={"artifact_id": artifact_id},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"]
    assert data["artifact_id"] == artifact_id
    assert data["status"] == "active"
    assert "artifact_snapshot" in data


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, artifact_id: str) -> None:
    await client.post(
        "/api/v1/projects",
        json={"artifact_id": artifact_id},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    resp = await client.get(
        "/api/v1/projects",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    projects = resp.json()
    assert len(projects) >= 1
    assert all(p["workspace_id"] == WORKSPACE_ID for p in projects)


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, artifact_id: str) -> None:
    create_resp = await client.post(
        "/api/v1/projects",
        json={"artifact_id": artifact_id},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    project_id = create_resp.json()["id"]

    resp = await client.get(
        f"/api/v1/projects/{project_id}",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == project_id
    assert "artifact_snapshot" in data


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, artifact_id: str) -> None:
    create_resp = await client.post(
        "/api/v1/projects",
        json={"artifact_id": artifact_id},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    project_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Mi proyecto renombrado", "status": "archived"},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Mi proyecto renombrado"
    assert data["status"] == "archived"


@pytest.mark.asyncio
async def test_create_project_from_nonexistent_artifact(
    client: AsyncClient,
) -> None:
    resp = await client.post(
        "/api/v1/projects",
        json={"artifact_id": "nonexistent_id"},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_project_isolation_by_workspace(client: AsyncClient, artifact_id: str) -> None:
    create_resp = await client.post(
        "/api/v1/projects",
        json={"artifact_id": artifact_id},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    project_id = create_resp.json()["id"]

    # Other workspace should not see this project
    resp = await client.get(
        f"/api/v1/projects/{project_id}",
        headers={"X-Workspace-Id": "ws_other"},
    )
    assert resp.status_code == 403
