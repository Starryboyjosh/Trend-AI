from __future__ import annotations

from app.core.capabilities import QualityLevel
from app.core.config import settings
from app.core.errors import AppError
from app.providers.content import (
    ContentModelProvider,
    DemoContentModelProvider,
    OpenAICompatibleContentModelProvider,
)
from app.providers.openrouter_catalog import OpenRouterModelCatalog
from app.providers.vision import (
    DemoVisionReviewProvider,
    OpenAICompatibleVisionReviewProvider,
    VisionReviewProvider,
)


def get_content_provider(*, quality_level: QualityLevel = QualityLevel.FAST) -> ContentModelProvider:
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
            max_retries=settings.ai_max_retries,
            retry_base_seconds=settings.ai_retry_base_seconds,
            http_referer=settings.ai_http_referer,
            app_title=settings.ai_app_title,
        )
    if settings.ai_provider == "openrouter":
        if not settings.openrouter_api_key or not settings.openrouter_fast_model:
            raise AppError(
                "GENERATION_PROVIDER_UNAVAILABLE",
                "La configuración del proveedor de contenido no está disponible.",
                status_code=503,
                retryable=False,
            )
        # Do not trust a mutated Settings instance: fast is the only route
        # deliberately guaranteed free in this wave.
        if settings.openrouter_fast_model != "openrouter/free":
            raise AppError(
                "CAPABILITY_UNAVAILABLE",
                "La ruta rápida de OpenRouter no está configurada como gratuita.",
                status_code=503,
                retryable=False,
            )
        model_by_quality = {
            QualityLevel.FAST: settings.openrouter_fast_model,
            QualityLevel.BALANCED: settings.openrouter_balanced_model,
            QualityLevel.QUALITY: settings.openrouter_quality_model,
        }
        model_name = model_by_quality[quality_level]
        if not model_name:
            raise AppError(
                "CAPABILITY_UNAVAILABLE",
                "El nivel de calidad solicitado no está configurado.",
                status_code=503,
                retryable=False,
            )
        return OpenAICompatibleContentModelProvider(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            model_name=model_name,
            timeout_seconds=settings.ai_timeout_seconds,
            max_retries=settings.ai_max_retries,
            retry_base_seconds=settings.ai_retry_base_seconds,
            http_referer=settings.ai_http_referer,
            app_title=settings.ai_app_title,
            provider_name="openrouter",
            structured_output=True,
        )
    raise AppError(
        "GENERATION_PROVIDER_UNAVAILABLE",
        "El proveedor de contenido configurado no está disponible.",
        status_code=503,
        retryable=False,
    )


def get_openrouter_model_catalog() -> OpenRouterModelCatalog:
    """Build the optional cache around the existing OpenAI-compatible adapter."""
    provider = get_content_provider(quality_level=QualityLevel.FAST)
    if settings.ai_provider != "openrouter" or not isinstance(
        provider, OpenAICompatibleContentModelProvider
    ):
        raise AppError(
            "CAPABILITY_UNAVAILABLE",
            "El catálogo OpenRouter no está configurado.",
            status_code=503,
            retryable=False,
        )
    return OpenRouterModelCatalog(
        ttl_seconds=settings.openrouter_catalog_ttl_seconds,
        fetcher=provider.fetch_model_catalog,
    )


def get_vision_provider() -> VisionReviewProvider:
    """Build the visual-review provider without coupling it to asset storage."""

    if settings.vision_provider == "demo":
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
