from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.templates.repository import SEED_TEMPLATES

WORKSPACE_ID = "ws_test_001"


@pytest.mark.asyncio
async def test_list_templates(seeded_client: AsyncClient) -> None:
    resp = await seeded_client.get(
        "/api/v1/templates",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == len(SEED_TEMPLATES)
    assert all("id" in t for t in data)
    assert all("title" in t for t in data)


@pytest.mark.asyncio
async def test_seed_templates_is_idempotent(seeded_client: AsyncClient) -> None:
    first = await seeded_client.get(
        "/api/v1/templates",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    second = await seeded_client.get(
        "/api/v1/templates",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert len(second.json()) == len(SEED_TEMPLATES)


@pytest.mark.asyncio
async def test_list_templates_filter_by_platform(seeded_client: AsyncClient) -> None:
    resp = await seeded_client.get(
        "/api/v1/templates?platform=tiktok",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    for t in data:
        assert "tiktok" in t["platforms"]


@pytest.mark.asyncio
async def test_list_templates_filter_by_category(seeded_client: AsyncClient) -> None:
    resp = await seeded_client.get(
        "/api/v1/templates?category=promotion",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    for t in data:
        assert t["category"] == "promotion"


@pytest.mark.asyncio
async def test_list_templates_search(seeded_client: AsyncClient) -> None:
    resp = await seeded_client.get(
        "/api/v1/templates?search=reel",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any("Reel" in t["title"] for t in data)


@pytest.mark.asyncio
async def test_get_template(seeded_client: AsyncClient) -> None:
    resp = await seeded_client.get(
        "/api/v1/templates/tpl_reel_01",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "tpl_reel_01"
    assert data["title"] == "Reel promocional"
    assert "instagram" in data["platforms"]
    assert "reel" in data["formats"]


@pytest.mark.asyncio
async def test_get_template_not_found(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/templates/nonexistent",
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_recommend_templates_returns_ranked_rationales(seeded_client: AsyncClient) -> None:
    response = await seeded_client.post(
        "/api/v1/templates/recommendations",
        json={"platform": "instagram", "objective": "sales", "category": "promotion"},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert response.status_code == 200
    recommendations = response.json()
    assert recommendations
    assert recommendations[0]["score"] >= recommendations[-1]["score"]
    assert recommendations[0]["rationale"]


@pytest.mark.asyncio
async def test_create_project_from_template(seeded_client: AsyncClient) -> None:
    business_response = await seeded_client.post(
        "/api/v1/businesses",
        json={
            "name": "Café de prueba",
            "category": "gastronomy",
            "country": "Honduras",
            "city": "Tegucigalpa",
            "primary_product": "Café",
            "target_audience": "Clientes locales",
            "preferred_platforms": ["instagram"],
            "primary_objective": "sales",
        },
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    business_id = business_response.json()["id"]
    resp = await seeded_client.post(
        "/api/v1/projects",
        json={"template_id": "tpl_reel_01", "business_id": business_id},
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Reel promocional"
    assert data["platform"] == "instagram"
    assert data["status"] == "active"
    assert data["artifact_snapshot"] is not None
    assert data["source_template_id"] == "tpl_reel_01"
    assert data["artifact_id"] is not None

    reopened = await seeded_client.get(
        f"/api/v1/projects/{data['id']}", headers={"X-Workspace-Id": WORKSPACE_ID}
    )
    assert reopened.status_code == 200
    snapshot = reopened.json()["artifact_snapshot"]
    assert snapshot["hook"] == "Reel promocional"

    edited = await seeded_client.put(
        f"/api/v1/projects/{data['id']}/artifact-version",
        json={
            **snapshot,
            "hook": "Un reel listo para editar",
        },
        headers={"X-Workspace-Id": WORKSPACE_ID},
    )
    assert edited.status_code == 200
    assert edited.json()["version_number"] == 2
