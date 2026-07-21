from __future__ import annotations

from dataclasses import dataclass

from app.domain.models import GeneratedSocialPost
from app.generation.contracts import SocialPostModelRequest


@dataclass(frozen=True)
class GenerationEvaluation:
    accepted: bool
    issues: tuple[str, ...]


class SocialPostEvaluator:
    """Deterministic release checks; subjective rubric scoring remains a later provider-independent layer."""

    def evaluate(
        self, artifact: GeneratedSocialPost, request: SocialPostModelRequest
    ) -> GenerationEvaluation:
        issues: list[str] = []
        if artifact.platform != request.platform:
            issues.append("La plataforma no coincide con la solicitada.")
        if not artifact.call_to_action.strip():
            issues.append("Falta un llamado a la acción.")
        forbidden = {word.casefold() for word in request.business.forbidden_words}
        rendered = " ".join([artifact.hook, artifact.caption, artifact.call_to_action]).casefold()
        if any(word in rendered for word in forbidden):
            issues.append("El contenido incluye un término prohibido por la marca.")
        return GenerationEvaluation(accepted=not issues, issues=tuple(issues))
