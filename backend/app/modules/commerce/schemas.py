import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PlanOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    price: Decimal
    currency: str
    duration_days: int | None
    features: list[str]


class BillingStatus(BaseModel):
    is_premium: bool
    is_trial: bool
    plan_name: str | None
    expires_at: datetime | None
    cancelled: bool
    trial_available: bool
    speaking_daily_limit: int
    speaking_attempts_left_today: int


class CheckoutIn(BaseModel):
    plan_slug: str = Field(min_length=1, max_length=150)


class CheckoutOut(BaseModel):
    payment_id: uuid.UUID
    redirect_url: str


class DemoConfirmIn(BaseModel):
    success: bool


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: Decimal
    currency: str
    provider: str
    status: str
    created_at: datetime
    paid_at: datetime | None

    @classmethod
    def from_payment(cls, p) -> "PaymentOut":
        return cls(id=p.id, amount=p.amount, currency=p.currency, provider=p.provider, status=p.status.value,
                   created_at=p.created_at, paid_at=p.paid_at)
