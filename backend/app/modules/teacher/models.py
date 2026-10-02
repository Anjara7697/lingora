import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, UUIDPk, fk


class TeacherStudent(UUIDPk, Base):
    """Élèves suivis par un enseignant (CDC : « apprenants autorisés »). Géré par l'administration."""

    __tablename__ = "teacher_students"
    __table_args__ = (UniqueConstraint("teacher_id", "student_id"), CheckConstraint("teacher_id <> student_id"))

    teacher_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
