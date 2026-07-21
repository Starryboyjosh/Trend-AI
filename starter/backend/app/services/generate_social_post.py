from __future__ import annotations

from typing import Protocol

from app.domain.models import (
    BusinessGenerationContext,
    GeneratedSocialPost,
    GenerateSocialPostCommand,
)
from app.providers.content import ContentModelProvider


class BusinessContextRepository(Protocol):
    async def get_for_generation(
        self, *, workspace_id: str, business_id: str
    ) -> BusinessGenerationContext: ...


class ArtifactRepository(Protocol):
    async def save_social_post(
        self,
        *,
        workspace_id: str,
        conversation_id: str,
        profile_version: int,
        artifact: GeneratedSocialPost,
    ) -> GeneratedSocialPost: ...


class GenerateSocialPostService:
    def __init__(
        self,
        business_repository: BusinessContextRepository,
        artifact_repository: ArtifactRepository,
        provider: ContentModelProvider,
    ) -> None:
        self._business_repository = business_repository
        self._artifact_repository = artifact_repository
        self._provider = provider

    async def execute(self, command: GenerateSocialPostCommand) -> GeneratedSocialPost:
        context = await self._business_repository.get_for_generation(
            workspace_id=command.workspace_id,
            business_id=command.business_id,
        )
        raw = await self._provider.generate_social_post(context=context, command=command)
        artifact = GeneratedSocialPost.model_validate(raw)
        forbidden = {word.casefold() for word in context.forbidden_words}
        text = " ".join([artifact.hook, artifact.caption, artifact.call_to_action]).casefold()
        if any(word in text for word in forbidden):
            raise ValueError("Generated artifact contains a forbidden brand term")
        return await self._artifact_repository.save_social_post(
            workspace_id=command.workspace_id,
            conversation_id=command.conversation_id,
            profile_version=context.profile_version,
            artifact=artifact,
        )
