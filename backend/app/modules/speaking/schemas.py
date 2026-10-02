import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.modules.learning.models import Difficulty
from app.modules.speaking.models import SessionStatus, SpeakingMode


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ScenarioOut(ORM):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    context: str | None
    difficulty: Difficulty
    estimated_minutes: int | None


class TurnOut(BaseModel):
    id: uuid.UUID
    sequence_number: int
    transcript: str | None
    transcript_simulated: bool
    audio_url: str | None  # URL signée temporaire, jamais publique
    overall_score: float | None
    analysis: dict[str, Any] | None
    created_at: datetime


class FeedbackOut(BaseModel):
    overall_score: Decimal | None
    strengths: list[str]
    improvements: list[dict[str, Any]]
    recommendations: list[str]
    first_attempt_score: float | None
    last_attempt_score: float | None
    attempts: int


class SessionOut(ORM):
    id: uuid.UUID
    scenario_id: uuid.UUID
    mode: SpeakingMode
    status: SessionStatus
    started_at: datetime
    completed_at: datetime | None


class SessionDetail(BaseModel):
    session: SessionOut
    scenario: ScenarioOut
    turns: list[TurnOut]
    feedback: FeedbackOut | None
    attempts_left_today: int


class CreateSession(BaseModel):
    scenario_id: uuid.UUID
