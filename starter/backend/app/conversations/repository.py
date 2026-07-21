from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.business.models import BrandProfile, Business
from app.conversations.models import (
    ArtifactVersion,
    Conversation,
    GeneratedArtifact,
    Message,
)
from app.core.errors import NotFoundError
from app.domain.models import (
    BusinessGenerationContext,
    GeneratedSocialPost,
)


async def create_conversation(
    db: AsyncSession,
    workspace_id: str,
    business_id: str,
    title: str,
    created_by: str | None = None,
) -> Conversation:
    conv = Conversation(
        workspace_id=workspace_id,
        business_id=business_id,
        title=title,
        created_by=created_by,
    )
    db.add(conv)
    await db.flush()
    await db.refresh(conv)
    return conv


async def get_conversation(
    db: AsyncSession, workspace_id: str, conversation_id: str
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise NotFoundError("Conversación")
    return conv


async def list_conversations(
    db: AsyncSession, workspace_id: str, business_id: str | None = None
) -> list[Conversation]:
    query = select(Conversation).where(
        Conversation.workspace_id == workspace_id,
        Conversation.status == "active",
    )
    if business_id:
        query = query.where(Conversation.business_id == business_id)
    query = query.order_by(Conversation.updated_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def add_message(
    db: AsyncSession,
    conversation_id: str,
    role: str,
    content: str,
    intent: str | None = None,
    metadata_json: dict | None = None,
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        intent=intent,
        metadata_json=json.dumps(metadata_json) if metadata_json else None,
    )
    db.add(msg)
    await db.flush()
    return msg


async def get_messages(db: AsyncSession, conversation_id: str) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


class SqlBusinessContextRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_for_generation(
        self, *, workspace_id: str, business_id: str
    ) -> BusinessGenerationContext:
        result = await self._db.execute(
            select(Business).where(
                Business.id == business_id,
                Business.workspace_id == workspace_id,
            )
        )
        business = result.scalar_one_or_none()
        if business is None:
            raise NotFoundError("Negocio")

        result = await self._db.execute(
            select(BrandProfile).where(BrandProfile.business_id == business_id)
        )
        brand = result.scalar_one_or_none()

        tones = json.loads(brand.voice_tones) if brand else ["friendly"]
        preferred = json.loads(brand.preferred_words) if brand else []
        forbidden = json.loads(brand.forbidden_words) if brand else []
        value_prop = brand.value_proposition if brand else ""
        profile_version = brand.version if brand else 1

        return BusinessGenerationContext(
            business_id=business.id,
            name=business.name,
            category=business.category,
            city=business.city,
            country=business.country,
            primary_product=business.primary_product,
            target_audience=business.target_audience,
            preferred_platforms=json.loads(business.preferred_platforms),
            primary_objective=business.primary_objective,
            brand_tones=tones,
            value_proposition=value_prop,
            preferred_words=preferred,
            forbidden_words=forbidden,
            profile_version=profile_version,
        )


class SqlArtifactRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def save_social_post(
        self,
        *,
        workspace_id: str,
        conversation_id: str,
        profile_version: int,
        artifact: GeneratedSocialPost,
    ) -> GeneratedSocialPost:
        artifact_record = GeneratedArtifact(
            conversation_id=conversation_id,
            artifact_type=artifact.artifact_type,
            platform=artifact.platform,
            objective="engagement",
            model_provider="demo",
            model_name="demo-v1",
            business_profile_version=profile_version,
        )
        self._db.add(artifact_record)
        await self._db.flush()

        content = artifact.model_dump()
        version = ArtifactVersion(
            artifact_id=artifact_record.id,
            version_number=1,
            content_json=json.dumps(content),
            user_edited=False,
        )
        self._db.add(version)
        await self._db.flush()

        artifact_record.active_version_id = version.id
        await self._db.flush()
        return artifact
