from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.errors import AppError


@dataclass(frozen=True)
class VisionReviewRequest:
    """A bounded, authorized image review request with no storage URL or tenant data."""

    mime_type: str
    width: int | None
    height: int | None
    image_bytes: bytes | None = None


class VisionReviewProvider(Protocol):
    provider_name: str
    requires_image_content: bool

    async def analyze(self, *, request: VisionReviewRequest) -> dict:
        """Return untrusted data that the application validates against AssetAnalysis."""
        ...


class DemoVisionReviewProvider:
    """Offline evaluator that makes only technical claims about an upload."""

    provider_name = "demo"
    requires_image_content = False

    async def analyze(self, *, request: VisionReviewRequest) -> dict:
        return {
            "summary": (
                f"Revisión técnica local: formato {request.mime_type}, "
                f"{request.width} × {request.height} píxeles. "
                "Las sugerencias visuales requieren revisión humana o un proveedor de visión configurado."
            ),
            "strengths": [
                "El archivo superó la validación de formato.",
                "Las dimensiones de la imagen fueron registradas.",
            ],
            "improvements": [
                {
                    "priority": "low",
                    "area": "readability",
                    "reason": "La revisión local no puede medir contraste ni legibilidad del diseño.",
                    "action": "Verifica manualmente el contraste entre texto y fondo en una pantalla móvil.",
                },
                {
                    "priority": "high",
                    "area": "cta",
                    "reason": "La revisión local no interpreta el texto de la imagen.",
                    "action": "Confirma que el diseño incluya un llamado a la acción visible y específico.",
                },
                {
                    "priority": "low",
                    "area": "brand",
                    "reason": "La revisión local no compara la paleta del diseño con la marca.",
                    "action": "Comprueba que la paleta respete los colores aprobados de tu marca.",
                },
            ],
            "revised_copy": None,
            "accessibility_notes": [
                "Usa texto alternativo descriptivo.",
                "Evita solo color para transmitir información.",
            ],
        }


class OpenAICompatibleVisionReviewProvider:
    """Vision adapter for an OpenAI-compatible chat-completions endpoint."""

    provider_name = "openai-compatible"
    requires_image_content = True

    def __init__(
        self, *, base_url: str, api_key: str, model_name: str, timeout_seconds: float = 30
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model_name = model_name
        self._timeout_seconds = timeout_seconds

    async def analyze(self, *, request: VisionReviewRequest) -> dict:
        if not request.image_bytes:
            raise AppError(
                "ANALYSIS_PROVIDER_UNAVAILABLE",
                "No pudimos preparar la imagen para el análisis.",
                status_code=503,
                retryable=True,
            )
        image_data = base64.b64encode(request.image_bytes).decode("ascii")
        rubric = {
            "image": {
                "mime_type": request.mime_type,
                "width": request.width,
                "height": request.height,
            },
            "instructions": (
                "Evalúa solamente la imagen enviada para un pequeño negocio. "
                "Sé constructivo, no inventes precios, promociones ni datos del negocio. "
                "Devuelve únicamente JSON con summary, strengths, improvements, revised_copy "
                "y accessibility_notes. Cada improvement requiere priority (high, medium o low), "
                "area (message, hierarchy, readability, brand, cta, platform o accessibility), "
                "reason y action."
            ),
        }
        payload = {
            "model": self._model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": json.dumps(rubric, ensure_ascii=False)},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{request.mime_type};base64,{image_data}",
                            },
                        },
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 1400,
            "temperature": 0.2,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=payload,
                )
                response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise AppError(
                "ANALYSIS_PROVIDER_UNAVAILABLE",
                "El análisis visual no está disponible en este momento. Inténtalo nuevamente.",
                status_code=503,
                retryable=True,
            ) from exc
