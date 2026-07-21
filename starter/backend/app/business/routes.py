from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.business.repository import (
    brand_profile_to_dict,
    business_to_dict,
    create_business,
    get_brand_profile,
    get_business,
    update_business,
    upsert_brand_profile,
)
from app.dependencies import get_db, require_workspace
from app.domain.models import Objective, Platform, Tone

router = APIRouter(prefix="/businesses", tags=["business"])


class CreateBusinessRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=40)
    country: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=1, max_length=100)
    description: str | None = Field(None, max_length=1000)
    primary_product: str = Field(min_length=1, max_length=240)
    target_audience: str = Field(min_length=1, max_length=500)
    preferred_platforms: list[Platform] = Field(min_length=1)
    primary_objective: Objective


class UpdateBusinessRequest(BaseModel):
    name: str | None = Field(None, max_length=120)
    category: str | None = Field(None, max_length=40)
    country: str | None = Field(None, max_length=80)
    city: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=1000)
    primary_product: str | None = Field(None, max_length=240)
    target_audience: str | None = Field(None, max_length=500)
    preferred_platforms: list[Platform] | None = None
    primary_objective: Objective | None = None


class UpsertBrandProfileRequest(BaseModel):
    voice_tones: list[Tone] = Field(min_length=1, max_length=3)
    value_proposition: str = Field(min_length=1, max_length=500)
    preferred_words: list[str] = Field(default_factory=list, max_length=30)
    forbidden_words: list[str] = Field(default_factory=list, max_length=30)
    primary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


@router.get("")
async def list_businesses_endpoint(
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    from sqlalchemy import select

    from app.business.models import Business

    result = await db.execute(select(Business).where(Business.workspace_id == workspace_id))
    return [business_to_dict(b) for b in result.scalars().all()]


@router.post("", status_code=201)
async def create_business_endpoint(
    body: CreateBusinessRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    business = await create_business(db, workspace_id, body.model_dump())
    await db.commit()
    return business_to_dict(business)


@router.get("/{business_id}")
async def get_business_endpoint(
    business_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    business = await get_business(db, workspace_id, business_id)
    return business_to_dict(business)


@router.patch("/{business_id}")
async def update_business_endpoint(
    business_id: str,
    body: UpdateBusinessRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    clean = {k: v for k, v in body.model_dump(exclude_none=True).items() if v is not None}
    business = await update_business(db, workspace_id, business_id, clean)
    await db.commit()
    return business_to_dict(business)


@router.put("/{business_id}/brand-profile")
async def upsert_brand_profile_endpoint(
    business_id: str,
    body: UpsertBrandProfileRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = await upsert_brand_profile(db, workspace_id, business_id, body.model_dump())
    await db.commit()
    return brand_profile_to_dict(profile)


@router.get("/{business_id}/brand-profile")
async def get_brand_profile_endpoint(
    business_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = await get_brand_profile(db, workspace_id, business_id)
    return brand_profile_to_dict(profile)
