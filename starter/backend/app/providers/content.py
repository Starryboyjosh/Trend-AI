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
        text_lower = command.text.lower()
        cta = {
            "reach": "Compártelo con alguien que disfrutaría conocerlo.",
            "engagement": "Cuéntanos qué te parece.",
            "sales": "Escríbenos para conocer la disponibilidad.",
            "store_visits": "Visítanos y conócelo en el local.",
            "launch": "Descúbrelo desde su lanzamiento.",
            "brand_awareness": "Síguenos para conocer más de nuestra propuesta.",
            "community": "Únete a la conversación y comparte tu experiencia.",
        }[objective]
        hook = f"Una nueva idea de {context.name} para ti ✨"
        caption = (
            f"En {context.name} queremos presentarte {context.primary_product}. "
            f"Una propuesta pensada para {context.target_audience.lower()} en {context.city}. {cta}"
        )
        visual = "Usa una imagen clara del producto, poco texto y una acción principal visible."
        if "más corto" in text_lower or "shorter" in text_lower:
            caption = (
                f"{context.primary_product} de {context.name}. "
                f"Pensado para ti en {context.city}. {cta}"
            )
            hook = f"{context.primary_product} ✨"
            visual = "Imagen del producto con texto mínimo."
        if (
            "más juvenil" in text_lower
            or "more youthful" in text_lower
            or "more_youthful" in text_lower
        ):
            tone = "youthful"
            hook = f"Tu próximo favorito: {context.primary_product} 🔥"
            caption = (
                f"Atención {context.target_audience.lower()} 🔥 "
                f"{context.name} trae {context.primary_product}. "
                f"{cta} No te lo pierdas."
            )
        if (
            "más profesional" in text_lower
            or "more professional" in text_lower
            or "more_professional" in text_lower
        ):
            tone = "professional"
            hook = f"{context.primary_product} — {context.name}"
            caption = (
                f"{context.name} presenta {context.primary_product}. "
                f"Una propuesta cuidadosamente seleccionada para {context.target_audience.lower()} "
                f"en {context.city}. {cta}"
            )
        if (
            "más amigable" in text_lower
            or "more friendly" in text_lower
            or "more_friendly" in text_lower
        ):
            tone = "friendly"
            hook = f"¡Tenemos algo especial para ti! 🎉"
            caption = (
                f"¡Hola! En {context.name} tenemos {context.primary_product} que te encantará. "
                f"Está pensado para {context.target_audience.lower()} como tú. "
                f"{cta} Te esperamos."
            )
        return {
            "artifact_type": "social_post",
            "platform": platform,
            "hook": hook,
            "caption": caption,
            "call_to_action": cta,
            "hashtags": ["#HiTrendy", "#ContenidoParaNegocios"],
            "visual_direction": visual,
            "format_recommendation": "reel"
            if platform in {"instagram", "tiktok"}
            else "static_post",
            "assumptions": [f"Se utilizó el tono {tone} del perfil o la solicitud."],
        }
