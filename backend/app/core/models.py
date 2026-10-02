"""Briques communes des modèles (conventions du modèle de données §3-4)."""

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

__all__ = ["JSON", "Base", "SoftDelete", "Timestamps", "UUIDPk", "fk", "pg_enum", "utcnow"]

JSON = JSONB


def utcnow() -> datetime:
    return datetime.now().astimezone()


def pg_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Enum PostgreSQL natif ; les valeurs stockées sont les noms (STUDENT, ...)."""
    return Enum(enum_cls, name=name, native_enum=True, create_type=True)


def fk(target: str, *, nullable: bool = False, ondelete: str = "CASCADE", **kw: Any):
    return mapped_column(
        UUID(as_uuid=True), ForeignKey(target, ondelete=ondelete), nullable=nullable, **kw
    )


class UUIDPk:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SoftDelete:
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
