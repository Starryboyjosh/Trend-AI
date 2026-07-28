from __future__ import annotations

from fastapi import APIRouter, Response

from app.core.capabilities import (
    CapabilityRegistry,
    NullCapabilityOutcomeStore,
    PublicCapabilityResponse,
)

router = APIRouter(prefix="/capabilities", tags=["capabilities"])

_registry = CapabilityRegistry(outcome_store=NullCapabilityOutcomeStore())


@router.get("", response_model=dict[str, PublicCapabilityResponse])
async def get_capabilities(response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "private, no-store"
    return await _registry.get_public_snapshot()
