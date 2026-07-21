from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assets.models import Asset, AssetAnalysis
from app.assets.schemas import AssetAnalysisResult, Improvement
from app.core.config import settings
from app.core.errors import NotFoundError
from app.dependencies import get_db, require_workspace

router = APIRouter(prefix="/assets", tags=["assets"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}


class InitUploadResponse(BaseModel):
    upload_id: str
    upload_url: str
    fields: dict = Field(default_factory=dict)


@router.post("/uploads", response_model=InitUploadResponse)
async def init_upload(
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> InitUploadResponse:
    upload_id = uuid.uuid4().hex
    return InitUploadResponse(
        upload_id=upload_id,
        upload_url=f"/api/v1/assets/uploads/{upload_id}/complete",
        fields={},
    )


@router.post("/uploads/{upload_id}/complete")
async def complete_upload(
    upload_id: str,
    file: UploadFile,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if file.content_type not in ALLOWED_MIME:
        return {"status": "error", "message": "Formato no soportado. Usa JPEG, PNG, WebP o GIF."}

    content = await file.read()
    ext = Path(file.filename or "image.png").suffix or ".png"
    storage_name = f"{upload_id}{ext}"
    storage_path = UPLOAD_DIR / storage_name

    with open(storage_path, "wb") as f:
        f.write(content)

    asset = Asset(
        workspace_id=workspace_id,
        original_name=file.filename or "upload",
        storage_path=str(storage_path),
        mime_type=file.content_type or "image/png",
        file_size_bytes=len(content),
        asset_type="image",
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    await db.commit()

    return {
        "status": "ok",
        "asset_id": asset.id,
        "original_name": asset.original_name,
        "file_size_bytes": asset.file_size_bytes,
        "mime_type": asset.mime_type,
    }


@router.get("")
async def list_assets_endpoint(
    asset_type: str | None = None,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = select(Asset).where(Asset.workspace_id == workspace_id)
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    query = query.order_by(Asset.created_at.desc()).limit(50)
    result = await db.execute(query)
    return [
        {
            "id": a.id,
            "original_name": a.original_name,
            "mime_type": a.mime_type,
            "file_size_bytes": a.file_size_bytes,
            "asset_type": a.asset_type,
            "status": a.status,
            "width": a.width,
            "height": a.height,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in result.scalars().all()
    ]


@router.get("/{asset_id}")
async def get_asset_endpoint(
    asset_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.workspace_id == workspace_id)
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise NotFoundError("Activo")
    return {
        "id": asset.id,
        "original_name": asset.original_name,
        "mime_type": asset.mime_type,
        "file_size_bytes": asset.file_size_bytes,
        "asset_type": asset.asset_type,
        "status": asset.status,
        "width": asset.width,
        "height": asset.height,
        "created_at": asset.created_at.isoformat() if asset.created_at else None,
    }


@router.post("/{asset_id}/analyses")
async def analyze_asset_endpoint(
    asset_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.workspace_id == workspace_id)
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise NotFoundError("Activo")

    analysis = _demo_analyze(asset)
    analysis_record = AssetAnalysis(
        asset_id=asset_id,
        provider="demo",
        summary=analysis.summary,
        strengths_json=json.dumps(analysis.strengths),
        improvements_json=json.dumps([i.model_dump() for i in analysis.improvements]),
        revised_copy=analysis.revised_copy,
        accessibility_notes_json=json.dumps(analysis.accessibility_notes),
    )
    db.add(analysis_record)
    await db.commit()
    await db.refresh(analysis_record)

    return {
        "id": analysis_record.id,
        "asset_id": asset_id,
        "summary": analysis.summary,
        "strengths": analysis.strengths,
        "improvements": [i.model_dump() for i in analysis.improvements],
        "revised_copy": analysis.revised_copy,
        "accessibility_notes": analysis.accessibility_notes,
        "created_at": analysis_record.created_at.isoformat()
        if analysis_record.created_at
        else None,
    }


def _demo_analyze(asset: Asset) -> AssetAnalysisResult:
    improvements = [
        Improvement(
            priority="medium" if asset.file_size_bytes > 500_000 else "low",
            area="readability",
            reason="El contraste podría mejorarse para lectura en móviles.",
            action="Aumenta el contraste entre texto y fondo.",
        ),
        Improvement(
            priority="high",
            area="cta",
            reason="No se detecta un llamado a la acción claro.",
            action="Agrega un botón o texto que indique el siguiente paso.",
        ),
        Improvement(
            priority="low",
            area="brand",
            reason="Los colores de la marca no son evidentes.",
            action="Incorpora la paleta de colores de la marca.",
        ),
    ]
    return AssetAnalysisResult(
        summary=f"Imagen analizada: {asset.original_name}. Se encontraron oportunidades de mejora en contraste, llamado a la acción y presencia de marca.",
        strengths=["Imagen de alta resolución", "Composición limpia y ordenada"],
        improvements=improvements,
        revised_copy=None,
        accessibility_notes=[
            "Usa texto alternativo descriptivo.",
            "Evita solo color para transmitir información.",
        ],
    )
