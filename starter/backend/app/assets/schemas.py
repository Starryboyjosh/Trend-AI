from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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
    strengths: list[str] = Field(min_length=1, max_length=6)
    improvements: list[Improvement] = Field(min_length=1, max_length=8)
    revised_copy: str | None = Field(None, max_length=1200)
    accessibility_notes: list[str] = Field(default_factory=list, max_length=6)
