import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, Timestamps, UUIDPk, fk, pg_enum
from app.modules.learning.models import CefrLevel, cefr_type


class GoalStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    ACHIEVED = "ACHIEVED"
    ABANDONED = "ABANDONED"


class RecommendationStatus(enum.Enum):
    PENDING = "PENDING"
    DONE = "DONE"
    DISMISSED = "DISMISSED"
    EXPIRED = "EXPIRED"


class SkillSourceType(enum.Enum):
    PLACEMENT_TEST = "PLACEMENT_TEST"
    LESSON = "LESSON"
    SPEAKING = "SPEAKING"
    TEACHER = "TEACHER"
    ASSESSMENT = "ASSESSMENT"


class StudentSkillProgress(UUIDPk, Timestamps, Base):
    """État courant d'une compétence (l'historique est dans SkillProgressHistory)."""

    __tablename__ = "student_skill_progress"
    __table_args__ = (UniqueConstraint("student_id", "skill_id"),)

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    skill_id: Mapped[uuid.UUID] = fk("skills.id", ondelete="RESTRICT")
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    level: Mapped[CefrLevel | None] = mapped_column(cefr_type)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    last_assessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SkillProgressHistory(UUIDPk, Base):
    __tablename__ = "skill_progress_history"

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    skill_id: Mapped[uuid.UUID] = fk("skills.id", ondelete="RESTRICT")
    source_type: Mapped[SkillSourceType] = mapped_column(
        pg_enum(SkillSourceType, "skill_source_type"), nullable=False
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column()
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    level: Mapped[CefrLevel | None] = mapped_column(cefr_type)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Goal(UUIDPk, Timestamps, Base):
    __tablename__ = "goals"

    student_id: Mapped[uuid.UUID] = fk("users.id")
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    target_value: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    current_value: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[GoalStatus] = mapped_column(
        pg_enum(GoalStatus, "goal_status"), nullable=False, server_default="ACTIVE"
    )


class Recommendation(UUIDPk, Timestamps, Base):
    __tablename__ = "recommendations"

    student_id: Mapped[uuid.UUID] = fk("users.id")
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(30), nullable=False, server_default="RULES")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    status: Mapped[RecommendationStatus] = mapped_column(
        pg_enum(RecommendationStatus, "recommendation_status"),
        nullable=False,
        server_default="PENDING",
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


__all__ = [n for n in dir() if n[0].isupper() and n not in ("JSON", "Base")]
