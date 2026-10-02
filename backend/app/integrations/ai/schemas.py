"""Format normalisé du feedback. Sortie brute IA -> validation -> feedback normalisé -> étudiant."""

from typing import Literal

from pydantic import BaseModel, Field, ValidationError, field_validator

from app.integrations.ai.base import AIProviderError

DIMENSIONS = ("grammar", "vocabulary", "fluency", "relevance", "pronunciation")


class Issue(BaseModel):
    # CDC F18 : ne jamais présenter une suggestion ou une préférence comme une erreur certaine.
    kind: Literal["ERROR", "SUGGESTION", "STYLE"]
    original: str | None = None
    suggestion: str | None = None
    explanation: str = Field(max_length=500)


class Dimension(BaseModel):
    score: float | None = None  # None = non évalué (ex. prononciation en mode démo)
    issues: list[Issue] = []
    note: str | None = Field(None, max_length=300)

    @field_validator("score")
    @classmethod
    def _clamp(cls, v: float | None) -> float | None:
        return None if v is None else round(max(0.0, min(100.0, v)), 1)


class AnalysisResult(BaseModel):
    grammar: Dimension
    vocabulary: Dimension
    fluency: Dimension
    relevance: Dimension
    pronunciation: Dimension = Dimension()
    strengths: list[str] = []
    tips: list[str] = []

    @property
    def overall_score(self) -> float | None:
        scores = [d.score for d in self.dimensions().values() if d.score is not None]
        return round(sum(scores) / len(scores), 1) if scores else None

    def dimensions(self) -> dict[str, Dimension]:
        return {name: getattr(self, name) for name in DIMENSIONS}


def normalize(raw: dict) -> AnalysisResult:
    try:
        return AnalysisResult.model_validate(raw)
    except ValidationError as exc:
        raise AIProviderError(f"Réponse IA invalide : {exc.error_count()} erreur(s)") from exc
