from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.repository import (
    SqlArtifactRepository,
    SqlBusinessContextRepository,
    add_message,
    create_conversation,
    get_conversation,
    get_messages,
    list_conversations,
)
from app.dependencies import get_db, require_workspace
from app.domain.models import GeneratedSocialPost, GenerateSocialPostCommand
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
    }
