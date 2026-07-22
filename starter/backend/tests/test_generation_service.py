from __future__ import annotations

import pytest

from app.domain.models import (
    BusinessGenerationContext,
    GeneratedSocialPost,
    GenerateSocialPostCommand,
)
from app.services.generate_social_post import GenerateSocialPostService


def _context() -> BusinessGenerationContext:
    return BusinessGenerationContext(
        business_id="biz_001",
        name="Café Central",
        category="gastronomy",
        city="Tegucigalpa",
        country="Honduras",
        primary_product="Café frío",
        target_audience="Estudiantes",
        preferred_platforms=["instagram"],
        primary_objective="sales",
        brand_tones=["friendly"],
        value_proposition="Café cercano",
        forbidden_words=["barato"],
        profile_version=3,
    )


def _artifact() -> dict:
    return {
        "artifact_type": "social_post",
        "platform": "instagram",
        "hook": "Una pausa fría para tu día",
        "caption": "Conoce nuestro café frío preparado para estudiantes.",
        "call_to_action": "Visítanos hoy.",
        "hashtags": ["#CafeFrio"],
        "visual_direction": "Producto claro sobre una mesa luminosa.",
        "format_recommendation": "reel",
        "assumptions": ["Se utilizó el tono amistoso del perfil."],
    }


class ContextRepository:
    async def get_for_generation(
        self, *, workspace_id: str, business_id: str
    ) -> BusinessGenerationContext:
        assert workspace_id == "ws_001"
        assert business_id == "biz_001"
        return _context()


class ArtifactRepository:
    saved: dict | None = None

    async def save_social_post(self, **kwargs: object) -> GeneratedSocialPost:
        self.saved = kwargs
        return kwargs["artifact"]  # type: ignore[return-value]

    async def add_artifact_version(self, **kwargs: object) -> GeneratedSocialPost:
        self.saved = kwargs
        return kwargs["content"]  # type: ignore[return-value]


class RepairingProvider:
    provider_name = "test-provider"
    model_name = "test-model"

    def __init__(self) -> None:
        self.repair_calls = 0

    async def generate_social_post(self, *, request: object) -> dict:
        return {"platform": "instagram"}

    async def repair_social_post(
        self, *, request: object, invalid_output: dict, errors: list[str]
    ) -> dict:
        self.repair_calls += 1
        assert errors
        return _artifact()


class QualityRepairingProvider:
    provider_name = "test-provider"
    model_name = "test-model"

    def __init__(self) -> None:
        self.repair_calls = 0

    async def generate_social_post(self, *, request: object) -> dict:
        artifact = _artifact()
        artifact["caption"] = "Café frío por $99 con resultados garantizados."
        return artifact

    async def repair_social_post(
        self, *, request: object, invalid_output: dict, errors: list[str]
    ) -> dict:
        self.repair_calls += 1
        assert any("precio o descuento" in error or "garantía" in error for error in errors)
        return _artifact()


@pytest.mark.asyncio
async def test_generation_repairs_invalid_output_and_persists_auditable_metadata() -> None:
    repository = ArtifactRepository()
    provider = RepairingProvider()
    service = GenerateSocialPostService(ContextRepository(), repository, provider)

    artifact = await service.execute(
        GenerateSocialPostCommand(
            workspace_id="ws_001",
            business_id="biz_001",
            conversation_id="conv_001",
            text="Promociona el café frío",
            platform="instagram",
            objective="sales",
        )
    )

    assert artifact.caption == _artifact()["caption"]
    assert provider.repair_calls == 1
    assert repository.saved is not None
    assert repository.saved["objective"] == "sales"
    assert repository.saved["provider_name"] == "test-provider"
    assert repository.saved["model_name"] == "test-model"
    assert repository.saved["prompt_version"] == "social-copy@1.0.0"


@pytest.mark.asyncio
async def test_variation_uses_the_same_contract_repair_flow() -> None:
    repository = ArtifactRepository()
    provider = RepairingProvider()
    service = GenerateSocialPostService(ContextRepository(), repository, provider)

    artifact = await service.execute_variation(
        command=GenerateSocialPostCommand(
            workspace_id="ws_001",
            business_id="biz_001",
            conversation_id="conv_001",
            text="Hazlo más corto",
        ),
        artifact_id="artifact_001",
        parent_version_id="version_001",
    )

    assert artifact.caption == _artifact()["caption"]
    assert provider.repair_calls == 1
    assert repository.saved is not None
    assert repository.saved["artifact_id"] == "artifact_001"
    assert repository.saved["parent_version_id"] == "version_001"


@pytest.mark.asyncio
async def test_generation_repairs_unconfirmed_commercial_claims() -> None:
    repository = ArtifactRepository()
    provider = QualityRepairingProvider()
    service = GenerateSocialPostService(ContextRepository(), repository, provider)

    artifact = await service.execute(
        GenerateSocialPostCommand(
            workspace_id="ws_001",
            business_id="biz_001",
            conversation_id="conv_001",
            text="Promociona el café frío",
        )
    )

    assert artifact.caption == _artifact()["caption"]
    assert provider.repair_calls == 1
