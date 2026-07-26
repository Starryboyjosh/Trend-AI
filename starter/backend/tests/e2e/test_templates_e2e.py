from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_seeded_templates_are_available_and_unique(
    authenticated_client: tuple[AsyncClient, str],
) -> None:
    client, _ = authenticated_client

    first = await client.get("/api/v1/templates")
    second = await client.get("/api/v1/templates")

    assert first.status_code == second.status_code == 200
    templates = first.json()
    assert len(templates) == 8
    assert len({template["id"] for template in templates}) == len(templates)
    assert first.json() == second.json()
    assert all(
        {
            "id",
            "title",
            "platforms",
            "formats",
            "category",
            "objective",
            "thumbnail_url",
            "editable_slots",
            "description",
        }.issubset(template)
        for template in templates
    )

    selected = templates[0]
    detail = await client.get(f"/api/v1/templates/{selected['id']}")
    assert detail.status_code == 200
    assert detail.json() == selected
