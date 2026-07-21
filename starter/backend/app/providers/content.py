from __future__ import annotations

import json
from typing import Protocol

import httpx

from app.generation.contracts import SocialPostModelRequest
from app.generation.prompt_registry import get_social_copy_prompt


class ContentModelProvider(Protocol):
    provider_name: str
    model_name: str

    async def generate_social_post(
        self,
        *,
        request: SocialPostModelRequest,
    ) -> dict:
        """Return an untrusted provider payload to be validated by the application."""
        ...

    async def repair_social_post(
        self,
        *,
        request: SocialPostModelRequest,
        invalid_output: dict,
        errors: list[str],
    ) -> dict: ...


class DemoContentModelProvider:
    provider_name = "demo"
    model_name = "demo-v1"

    async def generate_social_post(
        self,
        *,
        request: SocialPostModelRequest,
    ) -> dict:
        context = request.business
        platform = request.platform
        tone = request.tone
        objective = request.objective
        text_lower = request.user_request.lower()
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
            hook = "¡Tenemos algo especial para ti! 🎉"
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

    async def repair_social_post(
        self,
        *,
        request: SocialPostModelRequest,
        invalid_output: dict,
        errors: list[str],
    ) -> dict:
        return await self.generate_social_post(request=request)


class OpenAICompatibleContentModelProvider:
    provider_name = "openai-compatible"

    def __init__(
        self, *, base_url: str, api_key: str, model_name: str, timeout_seconds: float = 30
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self.model_name = model_name
        self._timeout_seconds = timeout_seconds

    async def generate_social_post(self, *, request: SocialPostModelRequest) -> dict:
        system_prompt, _ = get_social_copy_prompt()
        return await self._complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(request.model_dump(), ensure_ascii=False)},
            ]
        )

    async def repair_social_post(
        self,
        *,
        request: SocialPostModelRequest,
        invalid_output: dict,
        errors: list[str],
    ) -> dict:
        system_prompt, _ = get_social_copy_prompt()
        repair = {
            "request": request.model_dump(),
            "invalid_output": invalid_output,
            "validation_errors": errors,
            "instruction": "Corrige sólo lo necesario y devuelve únicamente el JSON del schema.",
        }
        return await self._complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(repair, ensure_ascii=False)},
            ]
        )

    async def _complete(self, *, messages: list[dict[str, str]]) -> dict:
        headers = {"Authorization": f"Bearer {self._api_key}"}
        payload = {
            "model": self.model_name,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
        }
        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions", headers=headers, json=payload
            )
            response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
