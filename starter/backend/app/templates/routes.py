from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.templates.repository import get_template, list_templates

router = APIRouter(prefix="/templates", tags=["templates"])


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


@router.get("/{template_id}")
async def get_template_endpoint(
    template_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await get_template(db, template_id)
