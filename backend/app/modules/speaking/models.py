import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
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
from app.modules.learning.models import Difficulty, difficulty_type


class SpeakingMode(enum.Enum):
    PRACTICE = "PRACTICE"
    AI_CONVERSATION = "AI_CONVERSATION"
    ASSESSMENT = "ASSESSMENT"


class SessionStatus(enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABANDONED = "ABANDONED"


class Speaker(enum.Enum):
    STUDENT = "STUDENT"
    AI = "AI"
    TEACHER = "TEACHER"


class SpeakingScenario(UUIDPk, Timestamps, Base):
    __tablename__ = "speaking_scenarios"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    context: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[Difficulty] = mapped_column(difficulty_type, nullable=False)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    is_ai_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class SpeakingScenarioSkill(Base):
    __tablename__ = "speaking_scenario_skills"

    scenario_id: Mapped[uuid.UUID] = fk("speaking_scenarios.id", primary_key=True)
    skill_id: Mapped[uuid.UUID] = fk("skills.id", primary_key=True)
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default="1")


class MediaFile(UUIDPk, SoftDelete, Base):
    """Métadonnées seulement : le binaire vit dans l'Object Storage."""

    __tablename__ = "media_files"
    __table_args__ = (UniqueConstraint("storage_provider", "storage_key"),)

    storage_provider: Mapped[str] = mapped_column(String(30), nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    duration_seconds: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    checksum: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SpeakingSession(UUIDPk, Base):
    __tablename__ = "speaking_sessions"

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    scenario_id: Mapped[uuid.UUID] = fk("speaking_scenarios.id", ondelete="RESTRICT")
    mode: Mapped[SpeakingMode] = mapped_column(pg_enum(SpeakingMode, "speaking_mode"), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        pg_enum(SessionStatus, "speaking_session_status"), nullable=False, server_default="IN_PROGRESS"
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)


class SpeakingTurn(UUIDPk, Base):
    __tablename__ = "speaking_turns"
    __table_args__ = (UniqueConstraint("session_id", "sequence_number"),)

    session_id: Mapped[uuid.UUID] = fk("speaking_sessions.id", index=True)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker: Mapped[Speaker] = mapped_column(pg_enum(Speaker, "speaker"), nullable=False)
    text: Mapped[str | None] = mapped_column(Text)
    audio_file_id: Mapped[uuid.UUID | None] = fk("media_files.id", nullable=True, ondelete="SET NULL")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SpeechTranscription(UUIDPk, Base):
    __tablename__ = "speech_transcriptions"

    media_file_id: Mapped[uuid.UUID] = fk("media_files.id")
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str | None] = mapped_column(String(100))
    language: Mapped[str | None] = mapped_column(String(10))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    processing_time_ms: Mapped[int | None] = mapped_column(Integer)
    raw_response: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AiAnalysis(UUIDPk, Base):
    """Sortie IA brute + résultat normalisé, séparés des données pédagogiques (règle 4)."""

    __tablename__ = "ai_analyses"

    speaking_turn_id: Mapped[uuid.UUID] = fk("speaking_turns.id")
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str | None] = mapped_column(String(100))
    analysis_type: Mapped[str] = mapped_column(String(50), nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    result: Mapped[dict | None] = mapped_column(JSON)
    raw_response: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SpeakingFeedback(UUIDPk, Timestamps, Base):
    __tablename__ = "speaking_feedback"

    session_id: Mapped[uuid.UUID] = fk("speaking_sessions.id")
    overall_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    strengths: Mapped[dict | None] = mapped_column(JSON)
    weaknesses: Mapped[dict | None] = mapped_column(JSON)
    recommendations: Mapped[dict | None] = mapped_column(JSON)
    generated_by: Mapped[str] = mapped_column(String(50), nullable=False, server_default="AI")
    reviewed_by: Mapped[uuid.UUID | None] = fk("users.id", nullable=True, ondelete="SET NULL")


class TeacherFeedback(UUIDPk, Timestamps, Base):
    __tablename__ = "teacher_feedback"

    student_id: Mapped[uuid.UUID] = fk("users.id")
    teacher_id: Mapped[uuid.UUID] = fk("users.id", ondelete="RESTRICT")
    lesson_id: Mapped[uuid.UUID | None] = fk("lessons.id", nullable=True, ondelete="SET NULL")
    speaking_session_id: Mapped[uuid.UUID | None] = fk(
        "speaking_sessions.id", nullable=True, ondelete="SET NULL"
    )
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))


__all__ = [n for n in dir() if n[0].isupper() and n not in ("JSON", "Base")]
