from __future__ import annotations

from app.core.config import settings
from app.core.errors import AppError
from app.providers.content import (
    ContentModelProvider,
    DemoContentModelProvider,
    OpenAICompatibleContentModelProvider,
)
from app.providers.vision import (
    DemoVisionReviewProvider,
    OpenAICompatibleVisionReviewProvider,
    VisionReviewProvider,
)


def get_content_provider() -> ContentModelProvider:
    if settings.ai_provider == "demo":
        if settings.app_env == "production":
            raise AppError(
                "GENERATION_PROVIDER_UNAVAILABLE",
                "La configuración del proveedor de contenido no está disponible.",
                status_code=503,
                retryable=False,
            )
        return DemoContentModelProvider()
    if settings.ai_provider == "openai-compatible":
        if not settings.ai_base_url or not settings.ai_api_key:
            raise AppError(
                "GENERATION_PROVIDER_UNAVAILABLE",
                "La configuración del proveedor de contenido no está disponible.",
                status_code=503,
                retryable=False,
            )
        return OpenAICompatibleContentModelProvider(
            base_url=settings.ai_base_url,
            api_key=settings.ai_api_key,
            model_name=settings.ai_model,
            timeout_seconds=settings.ai_timeout_seconds,
        )
    raise AppError(
        "GENERATION_PROVIDER_UNAVAILABLE",
        "El proveedor de contenido configurado no está disponible.",
        status_code=503,
        retryable=False,
    )


def get_vision_provider() -> VisionReviewProvider:
    """Build the visual-review provider without coupling it to asset storage."""

    if settings.vision_provider == "demo":
        if settings.app_env == "production":
            raise AppError(
                "ANALYSIS_PROVIDER_UNAVAILABLE",
                "La configuración del análisis visual no está disponible.",
                status_code=503,
                retryable=False,
            )
        return DemoVisionReviewProvider()
    if settings.vision_provider == "openai-compatible":
        if not settings.vision_base_url or not settings.vision_api_key:
            raise AppError(
                "ANALYSIS_PROVIDER_UNAVAILABLE",
                "La configuración del análisis visual no está disponible.",
                status_code=503,
                retryable=False,
            )
        return OpenAICompatibleVisionReviewProvider(
            base_url=settings.vision_base_url,
            api_key=settings.vision_api_key,
            model_name=settings.vision_model,
            timeout_seconds=settings.ai_timeout_seconds,
        )
    raise AppError(
        "ANALYSIS_PROVIDER_UNAVAILABLE",
        "El proveedor de análisis visual configurado no está disponible.",
        status_code=503,
        retryable=False,
    )
