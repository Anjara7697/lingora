import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.learning.models import ActivityType, CefrLevel


class QuestionOut(BaseModel):
    id: uuid.UUID
    position: int
    type: ActivityType
    config: dict[str, Any]


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    instructions: str | None


class StartOut(BaseModel):
    attempt_id: uuid.UUID
    assessment: AssessmentOut
    questions: list[QuestionOut]
    answers: dict[str, Any]


class AnswerIn(BaseModel):
    answer: Any = Field(...)

    @field_validator("answer")
    @classmethod
    def _bounded(cls, v: Any) -> Any:
        if len(json.dumps(v, default=str)) > 2000:
            raise ValueError("Réponse trop volumineuse")
        return v


class SkillResult(BaseModel):
    code: str
    name: str
    score: Decimal
    level: CefrLevel | None
    confidence: Decimal | None


class PlacementResult(BaseModel):
    attempt_id: uuid.UUID
    completed_at: datetime | None
    overall_level: CefrLevel
    overall_score: Decimal | None
    skills: list[SkillResult]
    strongest: str | None
    weakest: str | None
    recommended_program_slug: str | None
