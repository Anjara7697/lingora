"""Vue administrateur des revenus : chiffres calculés à la demande depuis `payments` et `subscriptions`."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.commerce.models import Payment, PaymentStatus, Plan, Subscription
from app.modules.commerce.service import GRANTING, TRIAL_SLUG
from app.modules.identity.models import User


def _active_students(db: Session, now: datetime, trial: bool) -> int:
    trial_ids = select(Plan.id).where(Plan.slug == TRIAL_SLUG)
    in_trial = Subscription.plan_id.in_(trial_ids)
    return db.scalar(
        select(func.count(func.distinct(Subscription.student_id))).where(
            Subscription.status.in_(GRANTING), Subscription.expires_at > now, in_trial if trial else ~in_trial
        )
    )


def summary(db: Session, now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    since = now - timedelta(days=30)
    paid = Payment.status == PaymentStatus.SUCCESS
    rows = db.execute(
        select(
            Payment.currency,
            func.coalesce(func.sum(Payment.amount), 0),
            func.coalesce(func.sum(Payment.amount).filter(Payment.paid_at >= since), 0),
            func.count(),
        )
        .where(paid)
        .group_by(Payment.currency)
    ).all()
    trial_ids = select(Plan.id).where(Plan.slug == TRIAL_SLUG)
    trial_students = select(Subscription.student_id).where(Subscription.plan_id.in_(trial_ids))
    trials = db.scalar(select(func.count(func.distinct(Subscription.student_id))).where(Subscription.plan_id.in_(trial_ids)))
    converted = db.scalar(
        select(func.count(func.distinct(Payment.student_id))).where(paid, Payment.student_id.in_(trial_students))
    )
    by_status = dict(db.execute(select(Payment.status, func.count()).group_by(Payment.status)).all())
    return {
        "generated_at": now,
        "revenue": [
            {"currency": cur, "total": total, "last_30d": last30, "payments": n} for cur, total, last30, n in rows
        ],
        "active_paid": _active_students(db, now, trial=False),
        "active_trials": _active_students(db, now, trial=True),
        "trials_started": trials,
        "trials_converted": converted,
        "payments_by_status": {s.value: by_status.get(s, 0) for s in PaymentStatus},
    }


def list_payments(db: Session, status: PaymentStatus | None, limit: int, offset: int) -> dict:
    where = [Payment.status == status] if status else []
    total = db.scalar(select(func.count()).select_from(Payment).where(*where))
    rows = db.execute(
        select(Payment, User)
        .join(User, User.id == Payment.student_id)
        .where(*where)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    items = [
        {
            "id": p.id, "student_id": u.id, "student_name": f"{u.first_name} {u.last_name}", "student_email": u.email,
            "amount": p.amount, "currency": p.currency, "provider": p.provider, "status": p.status.value,
            "created_at": p.created_at, "paid_at": p.paid_at,
        }
        for p, u in rows
    ]
    return {"items": items, "total": total}
