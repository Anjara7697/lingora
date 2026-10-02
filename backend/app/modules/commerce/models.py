import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import JSON, Base, Timestamps, UUIDPk, fk, pg_enum


class SubscriptionStatus(enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PaymentStatus(enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class Plan(UUIDPk, Timestamps, Base):
    """Prix = données commerciales configurables, jamais codées en dur."""

    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="MGA")
    duration_days: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")


class PlanFeature(UUIDPk, Base):
    __tablename__ = "plan_features"
    __table_args__ = (UniqueConstraint("plan_id", "code"),)

    plan_id: Mapped[uuid.UUID] = fk("plans.id")
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    value: Mapped[str | None] = mapped_column(String(100))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)


class Subscription(UUIDPk, Timestamps, Base):
    __tablename__ = "subscriptions"

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True)
    plan_id: Mapped[uuid.UUID] = fk("plans.id", ondelete="RESTRICT")
    status: Mapped[SubscriptionStatus] = mapped_column(
        pg_enum(SubscriptionStatus, "subscription_status"), nullable=False, server_default="PENDING"
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    auto_renew: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")


class Payment(UUIDPk, Timestamps, Base):
    __tablename__ = "payments"
    # Idempotence des webhooks : une transaction fournisseur = un paiement.
    __table_args__ = (UniqueConstraint("provider", "provider_transaction_id"),)

    student_id: Mapped[uuid.UUID] = fk("users.id", index=True, ondelete="RESTRICT")
    subscription_id: Mapped[uuid.UUID | None] = fk(
        "subscriptions.id", nullable=True, ondelete="SET NULL"
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="MGA")
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_transaction_id: Mapped[str | None] = mapped_column(String(150))
    status: Mapped[PaymentStatus] = mapped_column(
        pg_enum(PaymentStatus, "payment_status"), nullable=False, server_default="PENDING"
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)


__all__ = [n for n in dir() if n[0].isupper() and n not in ("JSON", "Base")]
