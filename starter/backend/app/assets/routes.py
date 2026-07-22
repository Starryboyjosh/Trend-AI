from __future__ import annotations

import json
import uuid
import warnings
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assets.models import Asset, AssetAnalysis, UploadSession
from app.assets.schemas import AssetAnalysisResult
from app.core.config import settings
from app.core.errors import AppError, NotFoundError, ValidationError_
from app.dependencies import get_db, require_workspace
from app.providers.factory import get_vision_provider
from app.providers.storage import get_object_storage_provider
from app.providers.vision import VisionReviewRequest

router = APIRouter(prefix="/assets", tags=["assets"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


@dataclass(frozen=True)
class ImageMetadata:
    mime_type: str
    extension: str
    width: int
    height: int


def _validate_upload(content: bytes, declared_mime_type: str | None) -> ImageMetadata:
    if declared_mime_type not in ALLOWED_MIME:
        raise ValidationError_("Este tipo de archivo no es compatible. Usa PNG, JPG o WebP.")
    if not content:
        raise ValidationError_("No pudimos procesar este archivo.")
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise ValidationError_(
            f"El archivo supera el tamaño permitido de {settings.max_upload_mb} MB."
        )
    metadata = _read_image_metadata(content)
    if metadata is None or metadata.mime_type != declared_mime_type:
        raise ValidationError_("No pudimos procesar este archivo.")
    if metadata.width <= 0 or metadata.height <= 0:
        raise ValidationError_("No pudimos procesar este archivo.")
    if metadata.width * metadata.height > settings.max_upload_pixels:
        raise ValidationError_("La imagen supera el límite de dimensiones permitido.")
    if metadata.width * metadata.height > len(content) * settings.max_upload_expansion_ratio:
        raise ValidationError_("No pudimos procesar este archivo de forma segura.")
    return metadata


def _read_image_metadata(content: bytes) -> ImageMetadata | None:
    formats = {
        "JPEG": ("image/jpeg", ".jpg"),
        "PNG": ("image/png", ".png"),
        "WEBP": ("image/webp", ".webp"),
    }
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                image.verify()
                mime_type, extension = formats[image.format or ""]
                return ImageMetadata(mime_type, extension, image.width, image.height)
    except (
        KeyError,
        OSError,
        SyntaxError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
    ):
        return None


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
    db.add(
        UploadSession(
            id=upload_id,
            workspace_id=workspace_id,
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
        )
    )
    await db.commit()
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
    content = await file.read()
    image = _validate_upload(content, file.content_type)
    session_result = await db.execute(
        select(UploadSession).where(
            UploadSession.id == upload_id,
            UploadSession.workspace_id == workspace_id,
            UploadSession.completed_at.is_(None),
        )
    )
    upload_session = session_result.scalar_one_or_none()
    if upload_session is None or upload_session.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise NotFoundError("Sesión de carga")
    object_key = f"workspaces/{workspace_id}/assets/{upload_id}{image.extension}"
    storage = get_object_storage_provider()
    await storage.put(key=object_key, content=content, content_type=image.mime_type)
    try:
        asset = Asset(
            workspace_id=workspace_id,
            original_name=file.filename or "upload",
            storage_path=object_key,
            mime_type=image.mime_type,
            file_size_bytes=len(content),
            asset_type="image",
            width=image.width,
            height=image.height,
        )
        db.add(asset)
        upload_session.completed_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(asset)
    except Exception:
        await db.rollback()
        await storage.delete(key=object_key)
        raise

    return {
        "status": "ok",
        "asset_id": asset.id,
        "original_name": asset.original_name,
        "file_size_bytes": asset.file_size_bytes,
        "mime_type": asset.mime_type,
    }


@router.get("/{asset_id}/content")
async def read_asset_content_endpoint(
    asset_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id, Asset.workspace_id == workspace_id)
    )
    asset = result.scalar_one_or_none()
    if asset is None:
        raise NotFoundError("Activo")
    content = await get_object_storage_provider().read(key=asset.storage_path)
    return Response(
        content=content,
        media_type=asset.mime_type,
        headers={"Cache-Control": "private, max-age=60"},
    )


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

    provider = get_vision_provider()
    image_bytes = None
    if provider.requires_image_content:
        image_bytes = await get_object_storage_provider().read(key=asset.storage_path)
    try:
        analysis = AssetAnalysisResult.model_validate(
            await provider.analyze(
                request=VisionReviewRequest(
                    mime_type=asset.mime_type,
                    width=asset.width,
                    height=asset.height,
                    image_bytes=image_bytes,
                )
            )
        )
    except PydanticValidationError as exc:
        raise AppError(
            "ANALYSIS_INVALID_RESPONSE",
            "No pudimos validar el resultado del análisis visual. Inténtalo nuevamente.",
            status_code=502,
            retryable=True,
        ) from exc
    analysis_record = AssetAnalysis(
        asset_id=asset_id,
        provider=provider.provider_name,
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
        "review_mode": "technical" if provider.provider_name == "demo" else "visual",
        "created_at": analysis_record.created_at.isoformat()
        if analysis_record.created_at
        else None,
    }
