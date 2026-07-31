from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.idempotency import (
    complete,
    mark_failed,
    payload_fingerprint,
    recover_failed,
    reserve,
)
from app.core.capabilities import Capability, CapabilityStatus, get_runtime_capability_registry
from app.core.errors import AppError
from app.dependencies import get_db, require_workspace
from app.trends.factory import source_availability
from app.trends.models import TrendEvidence, TrendItem, TrendItemEvidence, WorkspaceTrendRelevance
from app.trends.service import TrendService

router = APIRouter(prefix="/trends", tags=["trends"])
_capability_registry = get_runtime_capability_registry()


class RefreshRequest(BaseModel):
    region: str = Field(min_length=2, max_length=80, pattern=r"^[A-Za-zÀ-ÿ _-]+$")
    category: str | None = Field(None, max_length=40, pattern=r"^[a-z_]+$")


def _item(item: TrendItem, relevance: WorkspaceTrendRelevance | None = None) -> dict:
    result = {
        "id": item.id,
        "title": item.title,
        "summary": item.summary,
        "region": item.region,
        "category": item.category,
        "observed_at": item.observed_at,
        "freshness_score": item.freshness_score,
        "scoring_version": item.scoring_version,
        "component_scores": json.loads(item.component_scores),
        "total_score": item.total_score,
        "calculated_at": item.calculated_at,
    }
    if relevance:
        result["workspace_relevance"] = {
            "score": relevance.score,
            "component_scores": json.loads(relevance.component_scores),
            "calculated_at": relevance.calculated_at,
        }
    return result


@router.post("/refresh", status_code=202)
async def refresh_trends(
    body: RefreshRequest,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key", max_length=160),
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if _capability_registry.get_base_capability(Capability.TREND_ANALYSIS).status not in {
        CapabilityStatus.AVAILABLE,
        CapabilityStatus.DEGRADED,
    }:
        raise AppError(
            "CAPABILITY_UNAVAILABLE",
            "El análisis de tendencias no está disponible.",
            status_code=503,
        )
    payload = {
        "region": body.region.strip().upper(),
        "category": body.category.strip().casefold() if body.category is not None else None,
    }
    request = await reserve(
        db,
        workspace_id=workspace_id,
        endpoint="POST:/trends/refresh",
        key=idempotency_key,
        payload_hash=payload_fingerprint(payload),
    )
    if request and request.status == "completed" and request.response_json:
        return json.loads(request.response_json)
    try:
        run = await TrendService(
            db, capability_registry=_capability_registry
        ).refresh(workspace_id=workspace_id, **payload)
    except Exception:
        await recover_failed(
            db,
            workspace_id=workspace_id,
            endpoint="POST:/trends/refresh",
            key=idempotency_key,
        )
        raise
    response = {
        "id": run.id,
        "status": run.status,
        "region": run.region,
        "category": run.category,
        "sources_attempted": json.loads(run.sources_attempted),
        "sources_succeeded": json.loads(run.sources_succeeded),
        "sources_failed": json.loads(run.sources_failed),
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "error": run.public_error,
    }
    if run.status == "failed":
        # A failed collection is deliberately retryable with the same key.
        # Do not persist an unsuccessful response as an idempotent completion.
        await mark_failed(
            db,
            workspace_id=workspace_id,
            endpoint="POST:/trends/refresh",
            key=idempotency_key,
        )
        return response
    return await complete(db, request, response)


@router.get("")
async def list_trends(
    region: str | None = Query(None, min_length=2, max_length=80),
    category: str | None = Query(None, max_length=40),
    limit: int = Query(20, ge=1, le=50),
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = TrendService(db)
    # Filters are normalized exactly like refresh so a stored identity is
    # reachable by any accepted spelling of the same region or category.
    items = await service.list(
        workspace_id=workspace_id,
        region=region.strip().upper() if region else None,
        category=category.strip().casefold() if category else None,
        limit=limit,
    )
    relevances = {
        row.trend_item_id: row
        for row in (
            await db.scalars(
                select(WorkspaceTrendRelevance).where(
                    WorkspaceTrendRelevance.workspace_id == workspace_id
                )
            )
        ).all()
    }
    return {"items": [_item(item, relevances.get(item.id)) for item in items]}


@router.get("/sources")
async def trend_sources(workspace_id: str = Depends(require_workspace)) -> dict:
    """Authenticated, safe source configuration/runtime summary."""

    del workspace_id
    return {
        "sources": [
            {
                "identifier": source.identifier,
                "public_name": source.public_name,
                "source_type": source.source_type,
                "configured": source.configured,
                "status": source.status,
                "next_reset_at": source.next_reset_at.isoformat()
                if source.next_reset_at is not None
                else None,
            }
            for source in await source_availability()
        ]
    }


@router.get("/{trend_id}")
async def trend_detail(
    trend_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    item = await TrendService(db).detail(workspace_id=workspace_id, trend_id=trend_id)
    if item is None:
        from app.core.errors import NotFoundError

        raise NotFoundError("Tendencia")
    relevance = await db.scalar(
        select(WorkspaceTrendRelevance).where(
            WorkspaceTrendRelevance.workspace_id == workspace_id,
            WorkspaceTrendRelevance.trend_item_id == item.id,
        )
    )
    evidences = (
        await db.scalars(
            select(TrendEvidence)
            .join(TrendItemEvidence)
            .where(TrendItemEvidence.trend_item_id == item.id)
            .order_by(TrendEvidence.source, TrendEvidence.canonical_url)
        )
    ).all()
    result = _item(item, relevance)
    result["evidence"] = [
        {
            "source": evidence.source,
            "source_url": evidence.source_url,
            "observed_at": evidence.observed_at,
            "region": evidence.region,
            "confidence": evidence.confidence,
        }
        for evidence in evidences
    ]
    return result
