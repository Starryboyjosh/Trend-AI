from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.models import (
    ArtifactFeedback,
    ArtifactVersion,
    Conversation,
    GeneratedArtifact,
    Message,
)
from app.conversations.repository import (
    SqlArtifactRepository,
    SqlBusinessContextRepository,
    add_message,
    create_conversation,
    get_conversation,
    get_messages,
    list_conversations,
)
from app.core.errors import AppError, NotFoundError, ValidationError_
from app.dependencies import get_db, require_workspace
from app.domain.models import (
    GeneratedSocialPost,
    GenerateSocialPostCommand,
    Objective,
    Platform,
    Tone,
    VariationKind,
)
from app.providers.factory import get_content_provider
from app.services.generate_social_post import GenerateSocialPostService

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    business_id: str
    title: str = Field(min_length=1, max_length=240)


class SendMessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    ui_intent: str | None = None
    platform: Platform | None = None
    tone: Tone | None = None
    objective: Objective | None = None
    attachment_ids: list[str] = Field(default_factory=list, max_length=5)


class UpdateConversationRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=240)
    status: Literal["active", "archived"] | None = None


class ArtifactFeedbackRequest(BaseModel):
    rating: Literal["useful", "not_useful"]
    reason: str | None = Field(None, max_length=500)


@router.post("/artifacts/{artifact_id}/feedback", status_code=201)
async def create_artifact_feedback_endpoint(
    artifact_id: str,
    body: ArtifactFeedbackRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(GeneratedArtifact)
        .join(Conversation, Conversation.id == GeneratedArtifact.conversation_id)
        .where(GeneratedArtifact.id == artifact_id, Conversation.workspace_id == workspace_id)
    )
    if result.scalar_one_or_none() is None:
        raise NotFoundError("Artículo")
    feedback = ArtifactFeedback(artifact_id=artifact_id, rating=body.rating, reason=body.reason)
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return {"id": feedback.id, "artifact_id": feedback.artifact_id, "rating": feedback.rating}


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
    status: Literal["active", "archived"] = "active",
    search: str | None = Query(None, min_length=1, max_length=120),
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    convs = await list_conversations(db, workspace_id, business_id, status, search)
    latest_message = (
        select(Message.content)
        .where(Message.conversation_id == Conversation.id)
        .order_by(Message.created_at.desc())
        .limit(1)
        .scalar_subquery()
    )
    # Load the compact history card data in one query, rather than one message query per thread.
    history_result = (
        await db.execute(
            select(Conversation.id, latest_message.label("last_message")).where(
                Conversation.id.in_([c.id for c in convs]),
                Conversation.workspace_id == workspace_id,
            )
        )
        if convs
        else None
    )
    last_messages = {row.id: row.last_message for row in history_result} if history_result else {}
    return [
        {
            "id": c.id,
            "title": c.title,
            "business_id": c.business_id,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "last_message": last_messages.get(c.id),
        }
        for c in convs
    ]


@router.patch("/{conversation_id}")
async def update_conversation_endpoint(
    conversation_id: str,
    body: UpdateConversationRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conversation = await get_conversation(db, workspace_id, conversation_id)
    if body.title is not None:
        conversation.title = body.title
    if body.status is not None:
        conversation.status = body.status
    await db.commit()
    await db.refresh(conversation)
    return {
        "id": conversation.id,
        "title": conversation.title,
        "status": conversation.status,
        "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
    }


@router.get("/{conversation_id}")
async def get_conversation_endpoint(
    conversation_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = await get_conversation(db, workspace_id, conversation_id)
    if conv.status != "active":
        raise ValidationError_("Restaura la conversación antes de crear una variación.")
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
    if conv.status != "active":
        raise ValidationError_("Restaura la conversación antes de enviar un mensaje.")

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
    provider = get_content_provider()
    service = GenerateSocialPostService(biz_repo, art_repo, provider)

    try:
        artifact: GeneratedSocialPost = await service.execute(command)
    except AppError:
        raise

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
    art_repo = SqlArtifactRepository(db)
    service = GenerateSocialPostService(biz_repo, art_repo, get_content_provider())
    artifact = await service.execute_variation(
        command=command,
        artifact_id=artifact_id,
        parent_version_id=current_version.id if current_version else None,
    )
    await db.commit()

    return {
        "type": "artifact",
        "artifact": artifact.model_dump(),
        "artifact_id": artifact_id,
        "version_number": (current_version.version_number + 1) if current_version else 1,
    }
