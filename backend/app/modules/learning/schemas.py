import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.learning.models import (
    ActivityType,
    ContentType,
    Difficulty,
    EnrollmentStatus,
    ProgressStatus,
)


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProgramOut(ORM):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    difficulty: Difficulty
    duration_weeks: int | None


class ProgramListItem(BaseModel):
    program: ProgramOut
    course_count: int
    lesson_count: int


class LessonSummary(ORM):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    position: int
    estimated_minutes: int | None


class LessonListItem(BaseModel):
    lesson: LessonSummary
    status: ProgressStatus


class CourseOut(ORM):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    position: int
    difficulty: Difficulty
    estimated_minutes: int | None


class CourseWithLessons(BaseModel):
    course: CourseOut
    lessons: list[LessonListItem]


class EnrollmentOut(ORM):
    id: uuid.UUID
    program_id: uuid.UUID
    status: EnrollmentStatus
    progress_percentage: Decimal
    started_at: datetime | None
    completed_at: datetime | None


class ProgramDetail(BaseModel):
    program: ProgramOut
    courses: list[CourseWithLessons]
    enrollment: EnrollmentOut | None


class EnrollmentItem(BaseModel):
    enrollment: EnrollmentOut
    program: ProgramOut


class ContentOut(ORM):
    id: uuid.UUID
    type: ContentType
    title: str | None
    body: str | None
    url: str | None


class ActivityOut(ORM):
    id: uuid.UUID
    type: ActivityType
    title: str
    instructions: str | None
    position: int
    points: int


class ActivityItem(BaseModel):
    activity: ActivityOut
    config: dict[str, Any]
    graded: bool
    mastered: bool
    attempts: int


class LessonProgressOut(ORM):
    status: ProgressStatus
    progress_percentage: Decimal


class LessonRef(ORM):
    id: uuid.UUID
    title: str


class ProgramRef(ORM):
    id: uuid.UUID
    name: str
    slug: str


class LessonDetail(BaseModel):
    lesson: LessonSummary
    course: LessonRef
    program: ProgramRef
    contents: list[ContentOut]
    activities: list[ActivityItem]
    progress: LessonProgressOut | None
    next_lesson: LessonRef | None


class SubmitRequest(BaseModel):
    answer: Any = None
    duration_seconds: int | None = Field(None, ge=0, le=86_400)

    @field_validator("answer")
    @classmethod
    def _bounded(cls, v: Any) -> Any:
        if len(json.dumps(v, default=str)) > 5000:
            raise ValueError("Réponse trop volumineuse")
        return v


class SubmitResult(BaseModel):
    graded: bool
    is_correct: bool | None
    score: Decimal | None
    points: int
    correct_answer: Any = None
    explanation: str | None = None
    lesson_progress: LessonProgressOut
    lesson_completed: bool


class NextStep(BaseModel):
    enrollment: EnrollmentOut
    program: ProgramOut
    lesson: LessonSummary | None
    course: LessonRef | None
