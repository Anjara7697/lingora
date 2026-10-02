import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import JSON, Base, Timestamps, UUIDPk, fk, pg_enum
from app.modules.learning.models import CefrLevel, Difficulty, cefr_type, difficulty_type


class AssessmentType(enum.Enum):
    PLACEMENT = "PLACEMENT"
    COURSE = "COURSE"
    LEVEL = "LEVEL"
    PROGRESS = "PROGRESS"
    FINAL = "FINAL"


class AttemptStatus(enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"


class Assessment(UUIDPk, Timestamps, Base):
    __tablename__ = "assessments"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[AssessmentType] = mapped_column(
        pg_enum(AssessmentType, "assessment_type"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    description: Mapped[str | None] = mapped_column(Text)
    instructions: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[Difficulty | None] = mapped_column(difficulty_type)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class AssessmentQuestion(UUIDPk, Base):
    __tablename__ = "assessment_questions"

    assessment_id: Mapped[uuid.UUID] = fk("assessments.id")
    activity_id: Mapped[uuid.UUID] = fk("activities.id", ondelete="RESTRICT")
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default="1")
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")


class AssessmentAttempt(UUIDPk, Base):
    __tablename__ = "assessment_attempts"

    assessment_id: Mapped[uuid.UUID] = fk("assessments.id", ondelete="RESTRICT")
    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    status: Mapped[AttemptStatus] = mapped_column(
        pg_enum(AttemptStatus, "attempt_status"), nullable=False, server_default="IN_PROGRESS"
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)


class AssessmentAnswer(UUIDPk, Base):
    __tablename__ = "assessment_answers"

    attempt_id: Mapped[uuid.UUID] = fk("assessment_attempts.id")
    question_id: Mapped[uuid.UUID] = fk("assessment_questions.id", ondelete="RESTRICT")
    answer: Mapped[dict | None] = mapped_column(JSON)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AssessmentSkillScore(UUIDPk, Base):
    __tablename__ = "assessment_skill_scores"

    attempt_id: Mapped[uuid.UUID] = fk("assessment_attempts.id")
    skill_id: Mapped[uuid.UUID] = fk("skills.id", ondelete="RESTRICT")
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    level: Mapped[CefrLevel | None] = mapped_column(cefr_type)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))


class StudentLearningProfile(UUIDPk, Timestamps, Base):
    __tablename__ = "student_learning_profiles"

    student_id: Mapped[uuid.UUID] = fk("users.id", unique=True)
    current_level: Mapped[CefrLevel | None] = mapped_column(cefr_type)
    target_level: Mapped[CefrLevel | None] = mapped_column(cefr_type)
    primary_goal: Mapped[str | None] = mapped_column(String(200))
    placement_attempt_id: Mapped[uuid.UUID | None] = fk(
        "assessment_attempts.id", nullable=True, ondelete="SET NULL"
    )
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))


__all__ = [n for n in dir() if n[0].isupper() and n not in ("JSON", "Base")]
