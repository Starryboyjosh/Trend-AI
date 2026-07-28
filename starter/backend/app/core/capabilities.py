from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol

from pydantic import BaseModel

from app.core.config import settings
from app.core.errors import AppError


class Capability(StrEnum):
    ADVISOR = "advisor"
    COPYWRITER = "copywriter"
    VISION_REVIEW = "vision_review"
    IMAGE_GENERATION = "image_generation"
    VIDEO_GENERATION = "video_generation"
    TREND_ANALYSIS = "trend_analysis"

    @classmethod
    def all(cls) -> list[Capability]:
        return list(cls)


class QualityLevel(StrEnum):
    FAST = "fast"
    BALANCED = "balanced"
    QUALITY = "quality"

    @classmethod
    def all(cls) -> list[QualityLevel]:
        return list(cls)


class CapabilityStatus(StrEnum):
    AVAILABLE = "available"
    UNCONFIGURED = "unconfigured"
    DISABLED = "disabled"
    RESTRICTED = "restricted"
    QUOTA_EXHAUSTED = "quota_exhausted"
    PAYMENT_REQUIRED = "payment_required"
    DEGRADED = "degraded"
    ERROR = "error"


class Tier(StrEnum):
    FREE = "free"
    PAID = "paid"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class CapabilityOutcome(StrEnum):
    SUCCESS = "success"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    QUOTA_EXHAUSTED = "quota_exhausted"
    PAYMENT_REQUIRED = "payment_required"
    PROVIDER_ERROR = "provider_error"
    INVALID_RESPONSE = "invalid_response"


_RESOLVE_ERROR_CODES: dict[CapabilityStatus, str] = {
    CapabilityStatus.UNCONFIGURED: "CAPABILITY_UNCONFIGURED",
    CapabilityStatus.DISABLED: "CAPABILITY_DISABLED",
    CapabilityStatus.RESTRICTED: "CAPABILITY_RESTRICTED",
    CapabilityStatus.QUOTA_EXHAUSTED: "AI_QUOTA_EXHAUSTED",
    CapabilityStatus.PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
    CapabilityStatus.DEGRADED: "CAPABILITY_DEGRADED",
    CapabilityStatus.ERROR: "CAPABILITY_UNAVAILABLE",
}


_ERROR_MESSAGES: dict[Capability, str] = {
    Capability.ADVISOR: "El asistente de recomendaciones no está disponible.",
    Capability.COPYWRITER: "La generación de textos no está disponible.",
    Capability.VISION_REVIEW: "La revisión visual no está disponible.",
    Capability.IMAGE_GENERATION: "La generación de imágenes no está disponible.",
    Capability.VIDEO_GENERATION: "La generación de video no está disponible.",
    Capability.TREND_ANALYSIS: "El análisis de tendencias no está disponible.",
}


_FALLBACK_MAP: dict[Capability, str | None] = {
    Capability.ADVISOR: None,
    Capability.COPYWRITER: None,
    Capability.VISION_REVIEW: None,
    Capability.IMAGE_GENERATION: "visual_brief",
    Capability.VIDEO_GENERATION: "script_and_storyboard",
    Capability.TREND_ANALYSIS: "business_recommendations",
}


class PublicCapabilityResponse(BaseModel):
    status: CapabilityStatus
    tier: Tier
    quality_levels: list[QualityLevel]
    message: str | None = None
    next_reset_at: str | None = None
    fallback: str | None = None


@dataclass
class PublicCapability:
    status: CapabilityStatus
    tier: Tier
    quality_levels: list[QualityLevel]
    message: str | None = None
    next_reset_at: str | None = None
    fallback: str | None = None


def _public_to_dict(pc: PublicCapability) -> dict[str, Any]:
    result: dict[str, Any] = {
        "status": pc.status.value,
        "tier": pc.tier.value,
        "quality_levels": [ql.value for ql in pc.quality_levels],
    }
    if pc.message is not None:
        result["message"] = pc.message
    if pc.next_reset_at is not None:
        result["next_reset_at"] = pc.next_reset_at
    if pc.fallback is not None:
        result["fallback"] = pc.fallback
    return result


@dataclass
class CapabilityRoute:
    capability: Capability
    quality_level: QualityLevel
    provider_key: str
    tier: Tier


class OutcomeStore(Protocol):
    def get(self, capability: Capability) -> CapabilityOutcome | None: ...
    def set(self, capability: Capability, outcome: CapabilityOutcome) -> None: ...
    def clear(self, capability: Capability | None = None) -> None: ...


class NullCapabilityOutcomeStore:
    def get(self, capability: Capability) -> CapabilityOutcome | None:
        return None

    def set(self, capability: Capability, outcome: CapabilityOutcome) -> None:
        return None

    def clear(self, capability: Capability | None = None) -> None:
        return None


class MemoryCapabilityOutcomeStore:
    def __init__(self) -> None:
        self._data: dict[str, CapabilityOutcome] = {}

    def get(self, capability: Capability) -> CapabilityOutcome | None:
        return self._data.get(capability.value)

    def set(self, capability: Capability, outcome: CapabilityOutcome) -> None:
        self._data[capability.value] = outcome

    def clear(self, capability: Capability | None = None) -> None:
        if capability:
            self._data.pop(capability.value, None)
        else:
            self._data.clear()


def _sanitized_message(capability: Capability, status: CapabilityStatus) -> str | None:
    if status == CapabilityStatus.AVAILABLE:
        return None
    return _ERROR_MESSAGES.get(capability, "Esta función no está disponible.")


class CapabilityRegistry:
    def __init__(self, outcome_store: OutcomeStore | None = None) -> None:
        self._outcome_store = outcome_store or NullCapabilityOutcomeStore()

    def _provider_status(self) -> tuple[CapabilityStatus, Tier]:
        if settings.ai_provider == "openai-compatible":
            has_creds = bool(settings.ai_base_url and settings.ai_api_key and settings.ai_model)
            if has_creds:
                return CapabilityStatus.AVAILABLE, Tier.UNKNOWN
            return CapabilityStatus.UNCONFIGURED, Tier.UNKNOWN
        if settings.ai_provider == "demo":
            if settings.app_env == "production":
                return CapabilityStatus.DISABLED, Tier.FREE
            return CapabilityStatus.AVAILABLE, Tier.FREE
        return CapabilityStatus.UNCONFIGURED, Tier.UNKNOWN

    def _vision_status(self) -> tuple[CapabilityStatus, Tier]:
        if settings.vision_provider == "openai-compatible":
            has_creds = bool(settings.vision_base_url and settings.vision_api_key and settings.vision_model)
            if has_creds:
                return CapabilityStatus.AVAILABLE, Tier.UNKNOWN
            return CapabilityStatus.UNCONFIGURED, Tier.UNKNOWN
        if settings.vision_provider == "demo":
            if settings.app_env == "production":
                return CapabilityStatus.DISABLED, Tier.FREE
            return CapabilityStatus.AVAILABLE, Tier.FREE
        return CapabilityStatus.UNCONFIGURED, Tier.UNKNOWN

    def _levels_for(self, status: CapabilityStatus) -> list[QualityLevel]:
        if status in (CapabilityStatus.AVAILABLE, CapabilityStatus.DEGRADED):
            return [QualityLevel.FAST]
        return []

    def _base_capability(self, capability: Capability) -> PublicCapability:
        if capability in (Capability.ADVISOR, Capability.COPYWRITER):
            status, tier = self._provider_status()
            return PublicCapability(
                status=status,
                tier=tier,
                quality_levels=self._levels_for(status),
                message=_sanitized_message(capability, status),
                fallback=_FALLBACK_MAP.get(capability),
            )

        if capability == Capability.VISION_REVIEW:
            status, tier = self._vision_status()
            return PublicCapability(
                status=status,
                tier=tier,
                quality_levels=self._levels_for(status),
                message=_sanitized_message(capability, status),
                fallback=_FALLBACK_MAP.get(capability),
            )

        if capability == Capability.IMAGE_GENERATION:
            if settings.image_generation_enabled:
                status, tier = CapabilityStatus.PAYMENT_REQUIRED, Tier.PAID
            else:
                status, tier = CapabilityStatus.DISABLED, Tier.PAID
            return PublicCapability(
                status=status,
                tier=tier,
                quality_levels=[],
                message=_sanitized_message(capability, status),
                fallback=_FALLBACK_MAP.get(capability),
            )

        if capability == Capability.VIDEO_GENERATION:
            if settings.video_generation_enabled:
                status, tier = CapabilityStatus.PAYMENT_REQUIRED, Tier.PAID
            else:
                status, tier = CapabilityStatus.DISABLED, Tier.PAID
            return PublicCapability(
                status=status,
                tier=tier,
                quality_levels=[],
                message=_sanitized_message(capability, status),
                fallback=_FALLBACK_MAP.get(capability),
            )

        if capability == Capability.TREND_ANALYSIS:
            status = CapabilityStatus.UNCONFIGURED if settings.trend_analysis_enabled else CapabilityStatus.DISABLED
            return PublicCapability(
                status=status,
                tier=Tier.FREE,
                quality_levels=[],
                message=_sanitized_message(capability, status),
                fallback=_FALLBACK_MAP.get(capability),
            )

        return PublicCapability(
            status=CapabilityStatus.UNCONFIGURED,
            tier=Tier.UNKNOWN,
            quality_levels=[],
            message=_sanitized_message(capability, CapabilityStatus.UNCONFIGURED),
        )

    def _apply_outcome(self, info: PublicCapability, outcome: CapabilityOutcome | None) -> PublicCapability:
        if outcome is None:
            return info

        base_status = info.status
        if base_status not in (CapabilityStatus.AVAILABLE, CapabilityStatus.DEGRADED):
            return info

        if outcome == CapabilityOutcome.SUCCESS:
            return PublicCapability(
                status=base_status if base_status == CapabilityStatus.AVAILABLE else CapabilityStatus.AVAILABLE,
                tier=info.tier,
                quality_levels=self._levels_for(CapabilityStatus.AVAILABLE),
                message=None,
                fallback=info.fallback,
            )

        if outcome == CapabilityOutcome.QUOTA_EXHAUSTED:
            return PublicCapability(
                status=CapabilityStatus.QUOTA_EXHAUSTED,
                tier=info.tier,
                quality_levels=[],
                message="La cuota de esta función se agotó.",
                fallback=info.fallback,
            )

        if outcome == CapabilityOutcome.PAYMENT_REQUIRED:
            return PublicCapability(
                status=CapabilityStatus.PAYMENT_REQUIRED,
                tier=Tier.PAID,
                quality_levels=[],
                message="Se requiere habilitar presupuesto para esta función.",
                fallback=info.fallback,
            )

        if outcome == CapabilityOutcome.PROVIDER_ERROR:
            return PublicCapability(
                status=CapabilityStatus.ERROR,
                tier=info.tier,
                quality_levels=[],
                message=info.message or "Esta función no está disponible.",
                fallback=info.fallback,
            )

        if outcome in (CapabilityOutcome.TIMEOUT, CapabilityOutcome.RATE_LIMITED, CapabilityOutcome.INVALID_RESPONSE):
            return PublicCapability(
                status=CapabilityStatus.DEGRADED,
                tier=info.tier,
                quality_levels=self._levels_for(CapabilityStatus.DEGRADED),
                message="Esta función está funcionando con capacidad reducida.",
                fallback=info.fallback,
            )

        return info

    async def get_public_snapshot(
        self,
        principal: object | None = None,
    ) -> dict[str, dict[str, Any]]:
        _ = principal
        caps = {}
        for cap in Capability.all():
            info = self._base_capability(cap)
            outcome = self._outcome_store.get(cap)
            info = self._apply_outcome(info, outcome)
            caps[cap.value] = _public_to_dict(info)
        return caps

    def get_capability(self, capability: Capability) -> PublicCapability:
        info = self._base_capability(capability)
        outcome = self._outcome_store.get(capability)
        return self._apply_outcome(info, outcome)

    async def resolve(
        self,
        capability: Capability,
        quality_level: QualityLevel,
        principal: object | None = None,
    ) -> CapabilityRoute:
        _ = principal

        if capability not in Capability.all():
            raise AppError(
                "CAPABILITY_UNCONFIGURED",
                _ERROR_MESSAGES.get(capability, "Capacidad desconocida."),
                status_code=400,
            )

        if quality_level not in QualityLevel.all():
            raise AppError(
                "CAPABILITY_UNAVAILABLE",
                "Nivel de calidad no reconocido.",
                status_code=400,
            )

        info = self.get_capability(capability)

        if info.status in _RESOLVE_ERROR_CODES:
            code = _RESOLVE_ERROR_CODES[info.status]
            msg = info.message or _ERROR_MESSAGES.get(capability, "No disponible.")
            raise AppError(code, msg, status_code=_status_code(info.status))

        if info.status == CapabilityStatus.AVAILABLE:
            if quality_level in info.quality_levels:
                provider_key = _resolve_provider_key(capability)
                return CapabilityRoute(
                    capability=capability,
                    quality_level=quality_level,
                    provider_key=provider_key,
                    tier=info.tier,
                )
            raise AppError(
                "CAPABILITY_UNAVAILABLE",
                f"El nivel '{quality_level.value}' no está disponible para {capability.value}.",
                status_code=400,
            )

        raise AppError(
            "CAPABILITY_UNAVAILABLE",
            info.message or "Capacidad no disponible.",
            status_code=503,
        )

    async def record_outcome(
        self,
        route: CapabilityRoute,
        outcome: CapabilityOutcome,
    ) -> None:
        self._outcome_store.set(route.capability, outcome)


def _resolve_provider_key(capability: Capability) -> str:
    if capability == Capability.VISION_REVIEW:
        return settings.vision_provider
    return settings.ai_provider


def _status_code(status: CapabilityStatus) -> int:
    if status == CapabilityStatus.PAYMENT_REQUIRED:
        return 402
    if status == CapabilityStatus.QUOTA_EXHAUSTED:
        return 429
    return 503
