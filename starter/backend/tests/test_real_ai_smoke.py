from __future__ import annotations

import os

import pytest

from app.core.config import Settings
from app.domain.models import (
    BusinessGenerationContext,
    GeneratedShortVideoScript,
    GeneratedSocialPost,
)
from app.generation.contracts import ShortVideoScriptModelRequest, SocialPostModelRequest
from app.providers.content import OpenAICompatibleContentModelProvider


def _smoke_skip_reason() -> str | None:
    enabled = os.environ.get("RUN_REAL_AI_SMOKE", "0").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if not enabled:
        return "RUN_REAL_AI_SMOKE no está habilitada."
    if os.environ.get("AI_PROVIDER", "").strip().lower() != "openai-compatible":
        return "AI_PROVIDER debe ser openai-compatible para el smoke real."
    missing = [
        name
        for name in ("AI_BASE_URL", "AI_API_KEY", "AI_MODEL")
        if not os.environ.get(name, "").strip()
    ]
    if missing:
        return f"Faltan variables requeridas para el smoke real: {', '.join(missing)}."
    if os.environ.get("AI_MODEL", "").strip() == "demo-v1":
        return "AI_MODEL debe identificar un modelo real para el smoke."
    return None


pytestmark = pytest.mark.skipif(
    _smoke_skip_reason() is not None,
    reason=_smoke_skip_reason() or "Configuración de smoke real incompleta.",
)


def _business() -> BusinessGenerationContext:
    return BusinessGenerationContext(
        business_id="business-real-smoke",
        name="Café Aurora",
        category="gastronomy",
        city="Tegucigalpa",
        country="Honduras",
        primary_product="café frío artesanal",
        target_audience="jóvenes profesionales",
        preferred_platforms=["instagram", "tiktok"],
        primary_objective="engagement",
        brand_tones=["friendly", "professional"],
        value_proposition="Bebidas artesanales preparadas al momento.",
        preferred_words=["artesanal", "fresco"],
        forbidden_words=["milagroso"],
        profile_version=1,
    )


@pytest.mark.asyncio
async def test_openrouter_generates_both_phase1_contracts() -> None:
    settings = Settings()
    settings.validate_runtime_configuration()
    assert settings.ai_provider == "openai-compatible"

    provider = OpenAICompatibleContentModelProvider(
        base_url=settings.ai_base_url,
        api_key=settings.ai_api_key,
        model_name=settings.ai_model,
        timeout_seconds=settings.ai_timeout_seconds,
        max_retries=settings.ai_max_retries,
        retry_base_seconds=settings.ai_retry_base_seconds,
        http_referer=settings.ai_http_referer,
        app_title=settings.ai_app_title,
    )
    business = _business()

    social_request = SocialPostModelRequest(
        business=business,
        user_request="Crea una publicación breve en español para presentar el café frío.",
        platform="instagram",
        tone="friendly",
        objective="engagement",
        prompt_version="real-smoke-v1",
        product_or_service=business.primary_product,
    )
    social_raw = await provider.generate_social_post(request=social_request)
    social = GeneratedSocialPost.model_validate(social_raw)
    assert social.caption.strip()
    assert social.platform == "instagram"

    video_request = ShortVideoScriptModelRequest(
        business=business,
        user_request="Crea un guion vertical de menos de 45 segundos en español.",
        platform="tiktok",
        tone="friendly",
        objective="engagement",
        prompt_version="real-smoke-v1",
        product_or_service=business.primary_product,
    )
    video_raw = await provider.generate_short_video_script(request=video_request)
    video = GeneratedShortVideoScript.model_validate(video_raw)
    assert 5 <= video.duration_seconds <= 90
    assert len(video.scenes) >= 2
