from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ShortText = Annotated[str, StringConstraints(max_length=280)]


class Improvement(BaseModel):
    model_config = ConfigDict(extra="forbid")
    priority: Literal["high", "medium", "low"]
    area: Literal[
        "message", "hierarchy", "readability", "brand", "cta", "platform", "accessibility"
    ]
    reason: str = Field(max_length=300)
    action: str = Field(max_length=300)


class AssetAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=1, max_length=500)
    strengths: list[ShortText] = Field(min_length=1, max_length=6)
    improvements: list[Improvement] = Field(min_length=1, max_length=8)
    revised_copy: str | None = Field(None, max_length=1200)
    accessibility_notes: list[ShortText] = Field(default_factory=list, max_length=6)
