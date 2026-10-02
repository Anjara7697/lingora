import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import JSON, Base, SoftDelete, Timestamps, UUIDPk, fk, pg_enum


class SkillType(enum.Enum):
    GRAMMAR = "GRAMMAR"
    VOCABULARY = "VOCABULARY"
    LISTENING = "LISTENING"
    READING = "READING"
    WRITING = "WRITING"
    SPEAKING = "SPEAKING"
    PRONUNCIATION = "PRONUNCIATION"
    FLUENCY = "FLUENCY"


class ContentType(enum.Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"
    EXTERNAL_LINK = "EXTERNAL_LINK"


class ActivityType(enum.Enum):
    MCQ = "MCQ"
    TRUE_FALSE = "TRUE_FALSE"
    FILL_BLANK = "FILL_BLANK"
    MATCHING = "MATCHING"
    ORDERING = "ORDERING"
    TRANSLATION = "TRANSLATION"
    LISTENING = "LISTENING"
    READING = "READING"
    WRITING = "WRITING"
    SPEAKING = "SPEAKING"
    OPEN_QUESTION = "OPEN_QUESTION"


class Difficulty(enum.Enum):
    BEGINNER = "BEGINNER"
    ELEMENTARY = "ELEMENTARY"
    INTERMEDIATE = "INTERMEDIATE"
    UPPER_INTERMEDIATE = "UPPER_INTERMEDIATE"
    ADVANCED = "ADVANCED"


class CefrLevel(enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


difficulty_type = pg_enum(Difficulty, "difficulty_level")
cefr_type = pg_enum(CefrLevel, "cefr_level")


class Skill(UUIDPk, Timestamps, Base):
    __tablename__ = "skills"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[SkillType] = mapped_column(pg_enum(SkillType, "skill_type"), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = fk("skills.id", nullable=True, ondelete="SET NULL")


class Program(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "programs"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[Difficulty] = mapped_column(difficulty_type, nullable=False)
    duration_weeks: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class Course(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("program_id", "slug"),)

    program_id: Mapped[uuid.UUID] = fk("programs.id", ondelete="RESTRICT")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(difficulty_type, nullable=False)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class Lesson(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("course_id", "slug"),)

    course_id: Mapped[uuid.UUID] = fk("courses.id", index=True, ondelete="RESTRICT")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class Content(UUIDPk, Timestamps, Base):
    __tablename__ = "contents"

    type: Mapped[ContentType] = mapped_column(pg_enum(ContentType, "content_type"), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)


class LessonContent(UUIDPk, Base):
    __tablename__ = "lesson_contents"
    __table_args__ = (UniqueConstraint("lesson_id", "content_id"),)

    lesson_id: Mapped[uuid.UUID] = fk("lessons.id")
    content_id: Mapped[uuid.UUID] = fk("contents.id", ondelete="RESTRICT")
    position: Mapped[int] = mapped_column(Integer, nullable=False)


class Activity(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "activities"

    lesson_id: Mapped[uuid.UUID] = fk("lessons.id", index=True, ondelete="RESTRICT")
    type: Mapped[ActivityType] = mapped_column(pg_enum(ActivityType, "activity_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    difficulty: Mapped[Difficulty | None] = mapped_column(difficulty_type)
    configuration: Mapped[dict | None] = mapped_column(JSON)


class ActivityAnswer(UUIDPk, Base):
    __tablename__ = "activity_answers"

    activity_id: Mapped[uuid.UUID] = fk("activities.id")
    label: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")


class CourseSkill(Base):
    __tablename__ = "course_skills"

    course_id: Mapped[uuid.UUID] = fk("courses.id", primary_key=True)
    skill_id: Mapped[uuid.UUID] = fk("skills.id", primary_key=True)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default="1")
    target_level: Mapped[CefrLevel | None] = mapped_column(cefr_type)


class LessonSkill(Base):
    __tablename__ = "lesson_skills"

    lesson_id: Mapped[uuid.UUID] = fk("lessons.id", primary_key=True)
    skill_id: Mapped[uuid.UUID] = fk("skills.id", primary_key=True)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default="1")


# --- Inscription & progression pédagogique (§8-9) ---


class EnrollmentStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"


class ProgressStatus(enum.Enum):
    LOCKED = "LOCKED"
    AVAILABLE = "AVAILABLE"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class Enrollment(UUIDPk, Timestamps, Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "program_id"),)

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    program_id: Mapped[uuid.UUID] = fk("programs.id", index=True, ondelete="RESTRICT")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    progress_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, server_default="0"
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        pg_enum(EnrollmentStatus, "enrollment_status"), nullable=False, server_default="ACTIVE"
    )


class LessonProgress(UUIDPk, Timestamps, Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("student_id", "lesson_id"),)

    student_id: Mapped[uuid.UUID] = fk("users.id")
    lesson_id: Mapped[uuid.UUID] = fk("lessons.id")
    status: Mapped[ProgressStatus] = mapped_column(
        pg_enum(ProgressStatus, "progress_status"), nullable=False, server_default="AVAILABLE"
    )
    progress_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, server_default="0"
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CourseProgress(UUIDPk, Timestamps, Base):
    __tablename__ = "course_progress"
    __table_args__ = (UniqueConstraint("student_id", "course_id"),)

    student_id: Mapped[uuid.UUID] = fk("users.id")
    course_id: Mapped[uuid.UUID] = fk("courses.id")
    progress_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, server_default="0"
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ActivityAttempt(UUIDPk, Base):
    """Historique : une ligne par tentative, jamais écrasée."""

    __tablename__ = "activity_attempts"

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    activity_id: Mapped[uuid.UUID] = fk("activities.id", ondelete="RESTRICT")
    answer: Mapped[dict | None] = mapped_column(JSON)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)


__all__ = [n for n in dir() if n[0].isupper() and n not in ("JSON", "Base")]
