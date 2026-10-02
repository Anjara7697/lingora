import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.learning.models import CefrLevel, EnrollmentStatus
from app.modules.speaking.models import SessionStatus
from app.modules.speaking.schemas import FeedbackOut, ScenarioOut, SessionOut, TurnOut
from app.modules.teacher.service import StudentStatus


class StudentRow(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    level: CefrLevel | None
    progress: float | None
    speaking_score: float | None
    last_activity_at: datetime | None
    status: StudentStatus


class DashboardOut(BaseModel):
    total_students: int
    active_students: int
    average_progress: float | None
    status_counts: dict[str, int]
    needs_attention: list[StudentRow]


class FeedbackItem(BaseModel):
    id: uuid.UUID
    teacher_name: str
    comment: str
    score: Decimal | None
    speaking_session_id: uuid.UUID | None
    lesson_id: uuid.UUID | None
    created_at: datetime


class StudentInfo(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    created_at: datetime


class SkillItem(BaseModel):
    code: str
    name: str
    score: Decimal
    level: CefrLevel | None
    last_assessed_at: datetime | None


class EnrollmentItem(BaseModel):
    program_name: str
    program_slug: str
    status: EnrollmentStatus
    progress: Decimal


class PlacementItem(BaseModel):
    attempt_id: uuid.UUID
    completed_at: datetime | None
    level: str | None
    score: Decimal | None


class AttemptItem(BaseModel):
    activity_title: str
    lesson_title: str
    is_correct: bool | None
    score: Decimal | None
    attempted_at: datetime


class SpeakingSessionItem(BaseModel):
    id: uuid.UUID
    scenario_title: str
    status: SessionStatus
    started_at: datetime
    attempts: int
    last_score: float | None


class StudentDetail(BaseModel):
    student: StudentInfo
    status: StudentStatus
    last_activity_at: datetime | None
    current_level: CefrLevel | None
    primary_goal: str | None
    skills: list[SkillItem]
    enrollments: list[EnrollmentItem]
    placements: list[PlacementItem]
    recent_attempts: list[AttemptItem]
    speaking_sessions: list[SpeakingSessionItem]
    feedback: list[FeedbackItem]


class StudentName(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str


class TeacherSessionDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session: SessionOut
    scenario: ScenarioOut
    turns: list[TurnOut]
    feedback: FeedbackOut | None
    student: StudentName
    teacher_feedback: list[FeedbackItem]


class FeedbackIn(BaseModel):
    comment: str = Field(min_length=1, max_length=2000)
    score: Decimal | None = Field(None, ge=0, le=100)
    speaking_session_id: uuid.UUID | None = None
    lesson_id: uuid.UUID | None = None
