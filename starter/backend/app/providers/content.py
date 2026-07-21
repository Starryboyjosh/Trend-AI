from __future__ import annotations

from typing import Protocol

from app.domain.models import BusinessGenerationContext, GenerateSocialPostCommand


class ContentModelProvider(Protocol):
    async def generate_social_post(
        self,
        *,
        context: BusinessGenerationContext,
        command: GenerateSocialPostCommand,
    ) -> dict:
        """Return an untrusted provider payload to be validated by the application."""
        ...


class DemoContentModelProvider:
    async def generate_social_post(
        self,
        *,
        context: BusinessGenerationContext,
        command: GenerateSocialPostCommand,
    ) -> dict:
        platform = command.platform or context.preferred_platforms[0]
        tone = command.tone or context.brand_tones[0]
        objective = command.objective or context.primary_objective
        cta = {
            "reach": "Compártelo con alguien que disfrutaría conocerlo.",
            "engagement": "Cuéntanos qué te parece.",
            "sales": "Escríbenos para conocer la disponibilidad.",
            "store_visits": "Visítanos y conócelo en el local.",
            "launch": "Descúbrelo desde su lanzamiento.",
            "brand_awareness": "Síguenos para conocer más de nuestra propuesta.",
            "community": "Únete a la conversación y comparte tu experiencia.",
        }[objective]
        return {
            "artifact_type": "social_post",
            "platform": platform,
            "hook": f"Una nueva idea de {context.name} para ti ✨",
            "caption": (
                f"En {context.name} queremos presentarte {context.primary_product}. "
                f"Una propuesta pensada para {context.target_audience.lower()} en {context.city}. {cta}"
            ),
            "call_to_action": cta,
            "hashtags": ["#HiTrendy", "#ContenidoParaNegocios"],
            "visual_direction": "Usa una imagen clara del producto, poco texto y una acción principal visible.",
            "format_recommendation": "reel"
            if platform in {"instagram", "tiktok"}
            else "static_post",
            "assumptions": [f"Se utilizó el tono {tone} del perfil o la solicitud."],
        }
