from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.models import ArtifactVersion, GeneratedArtifact
from app.conversations.repository import (
    SqlArtifactRepository,
    SqlBusinessContextRepository,
    add_message,
    create_conversation,
    get_conversation,
    get_messages,
    list_conversations,
)
from app.core.errors import NotFoundError
from app.dependencies import get_db, require_workspace
from app.domain.models import (
    GeneratedSocialPost,
    GenerateSocialPostCommand,
    VariationKind,
)
from app.providers.content import DemoContentModelProvider
from app.services.generate_social_post import GenerateSocialPostService

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    business_id: str
    title: str = Field(min_length=1, max_length=240)


class SendMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    platform: str | None = None
    tone: str | None = None
    objective: str | None = None


@router.post("", status_code=201)
async def create_conversation_endpoint(
    body: CreateConversationRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = await create_conversation(db, workspace_id, body.business_id, body.title)
    await db.commit()
    return {
        "id": conv.id,
        "workspace_id": conv.workspace_id,
        "business_id": conv.business_id,
        "title": conv.title,
        "status": conv.status,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
    }


@router.get("")
async def list_conversations_endpoint(
    business_id: str | None = None,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    convs = await list_conversations(db, workspace_id, business_id)
    return [
        {
            "id": c.id,
            "title": c.title,
            "business_id": c.business_id,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in convs
    ]


@router.get("/{conversation_id}")
async def get_conversation_endpoint(
    conversation_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = await get_conversation(db, workspace_id, conversation_id)
    msgs = await get_messages(db, conversation_id)
    return {
        "id": conv.id,
        "title": conv.title,
        "business_id": conv.business_id,
        "status": conv.status,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "intent": m.intent,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ],
    }


@router.post("/{conversation_id}/messages")
async def send_message_endpoint(
    conversation_id: str,
    body: SendMessageRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = await get_conversation(db, workspace_id, conversation_id)

    user_msg = await add_message(
        db, conversation_id, "user", body.text, intent="create_social_post"
    )

    command = GenerateSocialPostCommand(
        workspace_id=workspace_id,
        business_id=conv.business_id,
        conversation_id=conversation_id,
        text=body.text,
        platform=body.platform,
        tone=body.tone,
        objective=body.objective,
    )

    biz_repo = SqlBusinessContextRepository(db)
    art_repo = SqlArtifactRepository(db)
    provider = DemoContentModelProvider()
    service = GenerateSocialPostService(biz_repo, art_repo, provider)

    try:
        artifact: GeneratedSocialPost = await service.execute(command)
    except ValueError as e:
        return {
            "type": "error",
            "message": str(e),
        }

    from sqlalchemy import desc

    art_result = await db.execute(
        select(GeneratedArtifact)
        .where(GeneratedArtifact.conversation_id == conversation_id)
        .order_by(desc(GeneratedArtifact.created_at))
        .limit(1)
    )
    saved_artifact = art_result.scalar_one_or_none()

    assistant_msg = await add_message(
        db,
        conversation_id,
        "assistant",
        artifact.caption,
        intent="generated_social_post",
        metadata_json={"artifact_type": "social_post"},
    )

    await db.commit()

    return {
        "type": "artifact",
        "user_message": {
            "id": user_msg.id,
            "role": "user",
            "content": body.text,
        },
        "assistant_message": {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": artifact.caption,
        },
        "artifact": artifact.model_dump(),
        "artifact_id": saved_artifact.id if saved_artifact else None,
    }


class CreateVariationRequest(BaseModel):
    kind: VariationKind


@router.post("/{conversation_id}/artifacts/{artifact_id}/variations")
async def create_variation_endpoint(
    conversation_id: str,
    artifact_id: str,
    body: CreateVariationRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = await get_conversation(db, workspace_id, conversation_id)

    art_result = await db.execute(
        select(GeneratedArtifact).where(
            GeneratedArtifact.id == artifact_id,
            GeneratedArtifact.conversation_id == conversation_id,
        )
    )
    artifact_record = art_result.scalar_one_or_none()
    if artifact_record is None:
        raise NotFoundError("Artículo")

    version_result = await db.execute(
        select(ArtifactVersion)
        .where(ArtifactVersion.artifact_id == artifact_id)
        .order_by(ArtifactVersion.version_number.desc())
        .limit(1)
    )
    current_version = version_result.scalar_one_or_none()
    current_content = json.loads(current_version.content_json) if current_version else {}

    variation_text_map = {
        "shorter": "Hazlo más corto",
        "more_youthful": "Hazlo más juvenil",
        "more_professional": "Hazlo más profesional",
        "more_friendly": "Hazlo más amigable",
    }
    variation_text = variation_text_map.get(body.kind, "")

    tone_map: dict[VariationKind, str | None] = {
        "shorter": None,
        "more_youthful": "youthful",
        "more_professional": "professional",
        "more_friendly": "friendly",
    }
    variation_tone = tone_map.get(body.kind)

    command = GenerateSocialPostCommand(
        workspace_id=workspace_id,
        business_id=conv.business_id,
        conversation_id=conversation_id,
        text=variation_text,
        tone=variation_tone,
    )

    biz_repo = SqlBusinessContextRepository(db)
    context = await biz_repo.get_for_generation(
        workspace_id=workspace_id, business_id=conv.business_id
    )

    provider = DemoContentModelProvider()
    raw = await provider.generate_social_post(context=context, command=command)

    try:
        artifact = GeneratedSocialPost.model_validate(raw)
    except Exception as e:
        return {"type": "error", "message": f"Error al generar variación: {e}"}

    forbidden = {word.casefold() for word in context.forbidden_words}
    text = " ".join([artifact.hook, artifact.caption, artifact.call_to_action]).casefold()
    if any(word in text for word in forbidden):
        return {
            "type": "error",
            "message": "La variación contiene términos prohibidos de la marca.",
        }

    art_repo = SqlArtifactRepository(db)
    await art_repo.add_artifact_version(
        artifact_id=artifact_id,
        content=artifact,
        parent_version_id=current_version.id if current_version else None,
    )

    await db.commit()

    return {
        "type": "artifact",
        "artifact": artifact.model_dump(),
        "artifact_id": artifact_id,
        "version_number": (current_version.version_number + 1) if current_version else 1,
    }
