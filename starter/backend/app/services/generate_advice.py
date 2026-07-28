from __future__ import annotations

from pydantic import ValidationError

from app.core.errors import AppError
from app.domain.models import AdvisorResponse
from app.generation.contracts import AdvisorModelRequest
from app.generation.evaluation import AdvisorEvaluator
from app.providers.content import ContentModelProvider
from app.services.generate_social_post import BusinessContextRepository


class GenerateAdviceService:
    def __init__(
        self,
        business_repository: BusinessContextRepository,
        provider: ContentModelProvider,
        evaluator: AdvisorEvaluator | None = None,
    ) -> None:
        self._business_repository = business_repository
        self._provider = provider
        self.usage_metadata: dict[str, object] | None = None
        self._evaluator = evaluator or AdvisorEvaluator()

    async def execute(
        self, *, workspace_id: str, business_id: str, text: str, locale: str = "es"
    ) -> AdvisorResponse:
        context = await self._business_repository.get_for_generation(
            workspace_id=workspace_id, business_id=business_id
        )
        request = AdvisorModelRequest.from_context(
            context=context, user_request=text, locale=locale
        )
        raw = await self._provider.generate_advice(request=request)
        self.usage_metadata = raw.pop("__provider_metadata", None)
        try:
            response = AdvisorResponse.model_validate(raw)
        except ValidationError as exc:
            raise AppError(
                "GENERATION_CONTRACT_INVALID",
                "No pudimos preparar recomendaciones válidas. Inténtalo nuevamente.",
                status_code=502,
                retryable=True,
            ) from exc
        evaluation = self._evaluator.evaluate(response, context.forbidden_words)
        if not evaluation.accepted:
            raise AppError(
                "GENERATION_CONTRACT_INVALID",
                "No pudimos preparar recomendaciones válidas. Inténtalo nuevamente.",
                status_code=502,
                retryable=True,
            )
        return response
