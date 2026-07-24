from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import Any, Protocol

import httpx

from app.core.errors import AppError
from app.generation.contracts import ShortVideoScriptModelRequest, SocialPostModelRequest
from app.generation.prompt_registry import get_short_video_script_prompt, get_social_copy_prompt


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

    async def generate_short_video_script(self, *, request: ShortVideoScriptModelRequest) -> dict:
        """Return an untrusted provider payload to be validated by the application."""
        ...

    async def repair_short_video_script(
        self,
        *,
        request: ShortVideoScriptModelRequest,
        invalid_output: dict,
        errors: list[str],
    ) -> dict: ...


class DemoContentModelProvider:
    provider_name = "demo"
    model_name = "demo-v1"

    @staticmethod
    def _call_to_action(objective: str) -> str:
        return {
            "reach": "Compártelo con alguien que disfrutaría conocerlo.",
            "engagement": "Cuéntanos qué te parece.",
            "sales": "Escríbenos para conocer la disponibilidad.",
            "store_visits": "Visítanos y conócelo en el local.",
            "launch": "Descúbrelo desde su lanzamiento.",
            "brand_awareness": "Síguenos para conocer más de nuestra propuesta.",
            "community": "Únete a la conversación y comparte tu experiencia.",
        }[objective]

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
        cta = self._call_to_action(objective)
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

    async def generate_short_video_script(self, *, request: ShortVideoScriptModelRequest) -> dict:
        context = request.business
        cta = self._call_to_action(request.objective)
        product = context.primary_product
        return {
            "artifact_type": "short_video_script",
            "platform": request.platform,
            "hook": f"Así se vive {product} en {context.name}",
            "duration_seconds": 24,
            "scenes": [
                {
                    "order": 1,
                    "duration_seconds": 4,
                    "visual": f"Plano vertical cercano de {product} con luz natural.",
                    "on_screen_text": f"{product} en {context.name}",
                    "voiceover": f"¿Buscas una pausa diferente? Conoce {product}.",
                },
                {
                    "order": 2,
                    "duration_seconds": 10,
                    "visual": "Muestra el detalle más atractivo mientras una persona lo disfruta.",
                    "on_screen_text": "Hecho para disfrutar el momento",
                    "voiceover": (
                        f"En {context.name} lo pensamos para {context.target_audience.lower()}."
                    ),
                },
                {
                    "order": 3,
                    "duration_seconds": 10,
                    "visual": "Cierra con el producto y una toma simple del negocio o su empaque.",
                    "on_screen_text": "Conócelo hoy",
                    "voiceover": cta,
                },
            ],
            "call_to_action": cta,
            "caption": (
                f"Conoce {product} de {context.name}. "
                f"Una propuesta para {context.target_audience.lower()}. {cta}"
            ),
            "assumptions": [
                f"Se utilizó el tono {request.tone} y el objetivo {request.objective} del perfil."
            ],
        }

    async def repair_short_video_script(
        self,
        *,
        request: ShortVideoScriptModelRequest,
        invalid_output: dict,
        errors: list[str],
    ) -> dict:
        return await self.generate_short_video_script(request=request)


class OpenAICompatibleContentModelProvider:
    provider_name = "openai-compatible"

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        model_name: str,
        timeout_seconds: float = 30,
        max_retries: int = 1,
        retry_base_seconds: float = 0.5,
        http_referer: str = "",
        app_title: str = "HiTrendy",
        transport: httpx.AsyncBaseTransport | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self.model_name = model_name
        self._timeout = httpx.Timeout(timeout_seconds)
        self._max_retries = max_retries
        self._retry_base_seconds = retry_base_seconds
        self._http_referer = http_referer
        self._app_title = app_title
        self._transport = transport
        self._sleep = sleep

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

    async def generate_short_video_script(self, *, request: ShortVideoScriptModelRequest) -> dict:
        system_prompt, _ = get_short_video_script_prompt()
        return await self._complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(request.model_dump(), ensure_ascii=False)},
            ]
        )

    async def repair_short_video_script(
        self,
        *,
        request: ShortVideoScriptModelRequest,
        invalid_output: dict,
        errors: list[str],
    ) -> dict:
        system_prompt, _ = get_short_video_script_prompt()
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

    def _headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if self._http_referer:
            headers["HTTP-Referer"] = self._http_referer
        if self._app_title:
            headers["X-Title"] = self._app_title
        return headers

    async def _complete(self, *, messages: list[dict[str, str]]) -> dict:
        payload = {
            "model": self.model_name,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
        }

        for attempt in range(self._max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=self._timeout,
                    transport=self._transport,
                ) as client:
                    response = await client.post(
                        f"{self._base_url}/chat/completions",
                        headers=self._headers(),
                        json=payload,
                    )
            except asyncio.CancelledError:
                raise
            except httpx.TimeoutException as exc:
                if attempt < self._max_retries:
                    await self._backoff(attempt)
                    continue
                raise AppError(
                    "GENERATION_PROVIDER_TIMEOUT",
                    "La generación tardó demasiado. Inténtalo de nuevo.",
                    status_code=504,
                    retryable=True,
                ) from exc
            except httpx.RequestError as exc:
                if attempt < self._max_retries:
                    await self._backoff(attempt)
                    continue
                raise AppError(
                    "GENERATION_PROVIDER_UNAVAILABLE",
                    "No pudimos conectar con el servicio de generación. Inténtalo de nuevo.",
                    status_code=503,
                    retryable=True,
                ) from exc

            if response.status_code == 429:
                if attempt < self._max_retries:
                    await self._backoff(attempt)
                    continue
                raise AppError(
                    "GENERATION_PROVIDER_RATE_LIMITED",
                    "El servicio de generación está ocupado. Inténtalo de nuevo en un momento.",
                    status_code=503,
                    retryable=True,
                )

            if 500 <= response.status_code <= 599:
                if attempt < self._max_retries:
                    await self._backoff(attempt)
                    continue
                raise AppError(
                    "GENERATION_PROVIDER_UNAVAILABLE",
                    "El servicio de generación no está disponible en este momento.",
                    status_code=503,
                    retryable=True,
                )

            if response.status_code >= 400:
                raise AppError(
                    "GENERATION_PROVIDER_REJECTED",
                    "El servicio de generación rechazó la solicitud.",
                    status_code=502,
                    retryable=False,
                )

            return self._decode_response(response)

        raise AppError(
            "GENERATION_PROVIDER_UNAVAILABLE",
            "El servicio de generación no está disponible en este momento.",
            status_code=503,
            retryable=True,
        )

    async def _backoff(self, attempt: int) -> None:
        delay = self._retry_base_seconds * (2**attempt)
        await self._sleep(delay)

    @staticmethod
    def _decode_response(response: httpx.Response) -> dict[str, Any]:
        try:
            envelope = response.json()
        except ValueError as exc:
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            ) from exc

        if not isinstance(envelope, dict):
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            )

        choices = envelope.get("choices")
        if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            )

        message = choices[0].get("message")
        if not isinstance(message, dict):
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            )

        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            )

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            ) from exc

        if not isinstance(parsed, dict):
            raise AppError(
                "GENERATION_PROVIDER_INVALID_RESPONSE",
                "El servicio devolvió una respuesta que no pudimos procesar.",
                status_code=502,
                retryable=True,
            )
        return parsed
