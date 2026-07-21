from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Platform = Literal["instagram", "facebook", "tiktok", "whatsapp", "youtube", "x", "linkedin"]
Tone = Literal["friendly", "professional", "youthful", "elegant", "fun", "direct", "inspiring"]
Objective = Literal[
    "reach", "engagement", "sales", "store_visits", "launch", "brand_awareness", "community"
]


class BusinessGenerationContext(BaseModel):
    business_id: str
    name: str
    category: str
    city: str
    country: str
    primary_product: str
    target_audience: str
    preferred_platforms: list[Platform]
    primary_objective: Objective
    brand_tones: list[Tone]
    value_proposition: str
    preferred_words: list[str] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)
    profile_version: int = 1


class GenerateSocialPostCommand(BaseModel):
    workspace_id: str
    business_id: str
    conversation_id: str
    text: str = Field(min_length=1, max_length=4000)
    platform: Platform | None = None
    tone: Tone | None = None
    objective: Objective | None = None


class GeneratedSocialPost(BaseModel):
    artifact_type: Literal["social_post"] = "social_post"
    platform: Platform
    hook: str = Field(min_length=1, max_length=180)
    caption: str = Field(min_length=1, max_length=2200)
    call_to_action: str = Field(max_length=240)
    hashtags: list[str] = Field(max_length=5)
    visual_direction: str = Field(min_length=1, max_length=700)
    format_recommendation: Literal[
        "static_post", "carousel", "story", "reel", "short_video", "text_post"
    ]
    assumptions: list[str] = Field(default_factory=list, max_length=10)
