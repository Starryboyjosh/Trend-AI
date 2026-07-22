from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_workspace
from app.templates.repository import get_template, list_templates

router = APIRouter(prefix="/templates", tags=["templates"])


class RecommendTemplatesRequest(BaseModel):
    platform: str = Field(min_length=1, max_length=32)
    objective: str = Field(min_length=1, max_length=40)
    category: str | None = Field(None, max_length=40)
    limit: int = Field(default=3, ge=1, le=6)


@router.get("")
async def list_templates_endpoint(
    platform: str | None = Query(None),
    format: str | None = Query(None, alias="format"),
    category: str | None = Query(None),
    objective: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    return await list_templates(
        db,
        platform=platform,
        format=format,
        category=category,
        objective=objective,
        search=search,
    )


@router.post("/recommendations")
async def recommend_templates_endpoint(
    body: RecommendTemplatesRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    candidates = await list_templates(db)
    ranked: list[dict] = []
    for template in candidates:
        score = 0
        reasons: list[str] = []
        if body.platform in template["platforms"]:
            score += 3
            reasons.append(f"Compatible con {body.platform}.")
        if template["objective"] == body.objective:
            score += 2
            reasons.append("Coincide con el objetivo de contenido.")
        if body.category and template["category"] == body.category:
            score += 1
            reasons.append("Coincide con la categoría solicitada.")
        if score:
            ranked.append({**template, "score": score, "rationale": " ".join(reasons)})
    return sorted(ranked, key=lambda item: (-item["score"], item["title"]))[: body.limit]


@router.get("/{template_id}")
async def get_template_endpoint(
    template_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await get_template(db, template_id)
