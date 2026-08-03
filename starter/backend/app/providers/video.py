"""Provider boundary for asynchronous video generation.

WAVE-013 deliberately ships only an offline provider.  The interface keeps
the application independent from any future vendor while the demo stays
deterministic and never performs network or paid work.
"""

from __future__ import annotations

import base64
import hashlib
import json
import uuid
from dataclasses import dataclass
from importlib import resources
from typing import Any, Protocol

from app.core.config import settings


@dataclass(frozen=True, slots=True)
class VideoGenerationRequest:
    prompt: str
    negative_prompt: str | None
    storyboard: dict[str, Any]
    aspect_ratio: str
    duration_seconds: int
    model: str
    source_image: bytes | None
    source_image_mime: str | None


@dataclass(frozen=True, slots=True)
class VideoSubmission:
    provider_job_id: str
    provider_status: str


@dataclass(frozen=True, slots=True)
class VideoJobState:
    provider_status: str
    ready: bool
    failed: bool
    error_code: str | None
    error_message: str | None
    cost_units: int | None


@dataclass(frozen=True, slots=True)
class VideoArtifact:
    content: bytes
    mime_type: str


class VideoGenerationProvider(Protocol):
    name: str

    async def submit(self, request: VideoGenerationRequest) -> VideoSubmission: ...

    async def check(self, provider_job_id: str) -> VideoJobState: ...

    async def download(self, provider_job_id: str, *, duration_seconds: int) -> VideoArtifact: ...

    async def cancel(self, provider_job_id: str) -> bool: ...


_DEMO_FIXTURES: dict[int, str] = {
    5: "demo-9x16-5s.mp4",
    10: "demo-9x16-10s.mp4",
}


def _canonical_request(request: VideoGenerationRequest) -> str:
    payload = {
        "prompt": request.prompt,
        "negative_prompt": request.negative_prompt,
        "storyboard": request.storyboard,
        "aspect_ratio": request.aspect_ratio,
        "duration_seconds": request.duration_seconds,
        "model": request.model,
        "source_image": (
            base64.b64encode(request.source_image).decode("ascii")
            if request.source_image is not None
            else None
        ),
        "source_image_mime": request.source_image_mime,
    }
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


class DemoVideoGenerationProvider:
    """Deterministic fixture-backed provider for development and tests."""

    name = "demo"

    def __init__(self) -> None:
        if settings.app_env not in {"development", "test"}:
            raise RuntimeError("VIDEO_PROVIDER=demo solo está permitido en desarrollo y pruebas.")

    async def submit(self, request: VideoGenerationRequest) -> VideoSubmission:
        canonical = _canonical_request(request)
        request_digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        # The fixture output is deterministic, but each submitted job still
        # needs its own provider handle: the durable job table correctly
        # rejects two different requests with one provider_job_id.
        provider_job_id = f"demo_{request_digest}_{uuid.uuid4().hex}"
        return VideoSubmission(provider_job_id=provider_job_id, provider_status="pending")

    async def check(self, provider_job_id: str) -> VideoJobState:
        _ = provider_job_id
        return VideoJobState(
            provider_status="ready",
            ready=True,
            failed=False,
            error_code=None,
            error_message=None,
            cost_units=1,
        )

    async def download(self, provider_job_id: str, *, duration_seconds: int) -> VideoArtifact:
        _ = provider_job_id
        try:
            fixture_name = _DEMO_FIXTURES[duration_seconds]
        except KeyError as exc:
            raise ValueError("La duración no tiene una fixture demo exacta.") from exc
        fixture = resources.files("app.videos.fixtures").joinpath(fixture_name)
        return VideoArtifact(content=fixture.read_bytes(), mime_type="video/mp4")

    async def cancel(self, provider_job_id: str) -> bool:
        _ = provider_job_id
        return False
