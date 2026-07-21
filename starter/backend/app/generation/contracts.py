from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.domain.models import (
    BusinessGenerationContext,
    GenerateSocialPostCommand,
    Objective,
    Platform,
    Tone,
)


class SocialPostModelRequest(BaseModel):
    """A bounded, database-free envelope passed to a content provider."""

    model_config = ConfigDict(extra="forbid")

    prompt_id: str = "social-copy"
    prompt_version: str
    schema_version: str = "generated-social-post@1.0.0"
    locale: str = "es-HN"
    business: BusinessGenerationContext
    user_request: str = Field(min_length=1, max_length=4000)
    platform: Platform
    objective: Objective
    tone: Tone
    requested_artifact_type: str = "social_post"
    product_or_service: str = Field(min_length=1, max_length=240)
    call_to_action: str | None = None

    @classmethod
    def from_command(
        cls,
        *,
        context: BusinessGenerationContext,
        command: GenerateSocialPostCommand,
        prompt_version: str,
    ) -> SocialPostModelRequest:
        return cls(
            prompt_version=prompt_version,
            business=context,
            user_request=command.text,
            platform=command.platform or context.preferred_platforms[0],
            objective=command.objective or context.primary_objective,
            tone=command.tone or context.brand_tones[0],
            product_or_service=context.primary_product,
        )
