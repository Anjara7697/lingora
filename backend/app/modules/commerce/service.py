"""Abonnements : essai gratuit, achat Premium, droits d'accès (entitlements).

Règles : l'accès Premium dure jusqu'à `expires_at` (un abonnement annulé reste utilisable jusqu'à son terme) ;
un paiement n'active l'abonnement que par `apply_payment_result`, idempotent (rejeu de webhook sans effet).
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.integrations.payment import PaymentProviderError, get_provider
from app.modules.commerce.models import (
    Payment,
    PaymentStatus,
    Plan,
    PlanFeature,
    Subscription,
    SubscriptionStatus,
)
from app.modules.identity.models import User, UserRole
from app.modules.platform.models import Event
from app.shared.errors import AppError

TRIAL_SLUG = "premium-trial"
GRANTING = (SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED)  # CANCELLED = plus de renouvellement, accès jusqu'au terme


def _now() -> datetime:
    return datetime.now(UTC)


def _event(db: Session, user: User, name: str, entity: str, entity_id: uuid.UUID, props: dict | None = None) -> None:
    db.add(Event(user_id=user.id, event_name=name, entity_type=entity, entity_id=entity_id, properties=props))


# ---------- Droits d'accès ----------


def current_access(db: Session, user: User) -> Subscription | None:
    """Abonnement donnant accès au Premium maintenant (le plus long si plusieurs)."""
    return db.scalars(
        select(Subscription)
        .where(Subscription.student_id == user.id, Subscription.status.in_(GRANTING), Subscription.expires_at > _now())
        .order_by(Subscription.expires_at.desc())
    ).first()


def is_premium(db: Session, user: User) -> bool:
    return user.role != UserRole.STUDENT or current_access(db, user) is not None  # l'équipe n'est jamais limitée


def speaking_daily_limit(db: Session, user: User) -> int:
    return settings.speaking_daily_limit if is_premium(db, user) else settings.speaking_free_daily_limit


# ---------- Consultation ----------


def _plan(db: Session, slug: str) -> Plan | None:
    return db.scalar(select(Plan).where(Plan.slug == slug))


def trial_used(db: Session, user: User) -> bool:
    trial = _plan(db, TRIAL_SLUG)
    return trial is not None and db.scalar(
        select(Subscription.id).where(Subscription.student_id == user.id, Subscription.plan_id == trial.id)
    ) is not None


def list_plans(db: Session) -> list[dict]:
    plans = db.scalars(select(Plan).where(Plan.is_active, Plan.price > 0).order_by(Plan.price)).all()
    out = []
    for p in plans:
        features = db.scalars(select(PlanFeature).where(PlanFeature.plan_id == p.id).order_by(PlanFeature.code)).all()
        out.append({"id": p.id, "name": p.name, "slug": p.slug, "description": p.description, "price": p.price,
                    "currency": p.currency, "duration_days": p.duration_days, "features": [f.name for f in features]})
    return out


def status_view(db: Session, user: User) -> dict:
    from app.modules.speaking.service import attempts_today

    sub = current_access(db, user)
    plan = db.get(Plan, sub.plan_id) if sub else None
    is_student = user.role == UserRole.STUDENT
    limit = speaking_daily_limit(db, user)
    return {
        "is_premium": is_premium(db, user),
        "is_trial": bool(plan and plan.slug == TRIAL_SLUG),
        "plan_name": plan.name if plan else None,
        "expires_at": sub.expires_at if sub else None,
        "cancelled": bool(sub and sub.status == SubscriptionStatus.CANCELLED),
        "trial_available": is_student and sub is None and not trial_used(db, user) and _plan(db, TRIAL_SLUG) is not None,
        "speaking_daily_limit": limit,
        "speaking_attempts_left_today": max(0, limit - attempts_today(db, user)),
    }


def list_payments(db: Session, user: User) -> list[Payment]:
    return list(db.scalars(select(Payment).where(Payment.student_id == user.id).order_by(Payment.created_at.desc()).limit(50)))


# ---------- Actions ----------


def _require_student(user: User) -> None:
    if user.role != UserRole.STUDENT:
        raise AppError(403, "STUDENT_ONLY", "Réservé aux élèves : l'équipe a déjà tous les accès")


def start_trial(db: Session, user: User) -> dict:
    _require_student(user)
    trial = _plan(db, TRIAL_SLUG)
    if trial is None:
        raise AppError(404, "TRIAL_UNAVAILABLE", "Aucun essai gratuit n'est proposé pour le moment")
    if current_access(db, user) is not None:
        raise AppError(409, "ALREADY_PREMIUM", "Vous avez déjà accès au Premium")
    if trial_used(db, user):
        raise AppError(409, "TRIAL_ALREADY_USED", "Vous avez déjà utilisé votre essai gratuit")
    now = _now()
    sub = Subscription(student_id=user.id, plan_id=trial.id, status=SubscriptionStatus.ACTIVE, started_at=now,
                       expires_at=now + timedelta(days=trial.duration_days or settings.trial_days))
    db.add(sub)
    db.flush()
    _event(db, user, "trial_started", "subscription", sub.id)
    db.commit()
    return status_view(db, user)


def checkout(db: Session, user: User, plan_slug: str) -> dict:
    _require_student(user)
    plan = _plan(db, plan_slug)
    if plan is None or not plan.is_active or plan.price <= 0:
        raise AppError(404, "PLAN_NOT_FOUND", "Offre introuvable")
    provider = get_provider()
    sub = Subscription(student_id=user.id, plan_id=plan.id, status=SubscriptionStatus.PENDING)
    db.add(sub)
    db.flush()
    payment = Payment(student_id=user.id, subscription_id=sub.id, amount=plan.price, currency=plan.currency,
                      provider=provider.name)
    db.add(payment)
    db.flush()
    started = provider.create_checkout(payment.id, plan.price, plan.currency, f"{settings.app_base_url}/billing")
    payment.provider_transaction_id = started.transaction_id
    _event(db, user, "checkout_started", "payment", payment.id, {"plan": plan.slug})
    db.commit()
    return {"payment_id": payment.id, "redirect_url": started.redirect_url}


def apply_payment_result(db: Session, provider_name: str, transaction_id: str, success: bool) -> Payment:
    """Applique le résultat d'un paiement (webhook ou simulation). Idempotent : un paiement déjà réglé est ignoré."""
    payment = db.scalar(
        select(Payment)
        .where(Payment.provider == provider_name, Payment.provider_transaction_id == transaction_id)
        .with_for_update()
    )
    if payment is None:
        raise AppError(404, "PAYMENT_NOT_FOUND", "Paiement introuvable")
    if payment.status != PaymentStatus.PENDING:
        return payment
    user = db.get(User, payment.student_id)
    sub = db.get(Subscription, payment.subscription_id) if payment.subscription_id else None
    now = _now()
    if not success:
        payment.status = PaymentStatus.FAILED
        if sub is not None and sub.status == SubscriptionStatus.PENDING:
            sub.status = SubscriptionStatus.CANCELLED
        _event(db, user, "payment_failed", "payment", payment.id)
        db.commit()
        return payment
    payment.status = PaymentStatus.SUCCESS
    payment.paid_at = now
    if sub is not None:
        plan = db.get(Plan, sub.plan_id)
        running = current_access(db, user)  # un renouvellement s'ajoute à la période restante
        start = max(now, running.expires_at) if running else now
        sub.status = SubscriptionStatus.ACTIVE
        sub.started_at = now
        sub.expires_at = start + timedelta(days=plan.duration_days or 30)
        _event(db, user, "subscription_activated", "subscription", sub.id, {"plan": plan.slug})
    _event(db, user, "payment_succeeded", "payment", payment.id)
    db.commit()
    return payment


def demo_confirm(db: Session, user: User, payment_id: uuid.UUID, success: bool) -> dict:
    """Simulation du retour du fournisseur de démonstration (jamais en production)."""
    payment = db.get(Payment, payment_id)
    if payment is None or payment.student_id != user.id:
        raise AppError(404, "PAYMENT_NOT_FOUND", "Paiement introuvable")
    if payment.provider != "demo" or settings.environment == "production":
        raise AppError(403, "DEMO_ONLY", "La simulation n'est disponible qu'avec le fournisseur de démonstration")
    apply_payment_result(db, payment.provider, payment.provider_transaction_id, success)
    return status_view(db, user)


def handle_webhook(db: Session, provider_name: str, headers: dict[str, str], body: bytes) -> None:
    try:
        provider = get_provider(provider_name)
        event = provider.parse_webhook(headers, body)
    except PaymentProviderError as exc:
        raise AppError(400, "INVALID_WEBHOOK", str(exc)) from None
    apply_payment_result(db, provider.name, event.transaction_id, event.success)


def cancel(db: Session, user: User) -> dict:
    """Arrête le renouvellement ; l'accès reste valable jusqu'à la fin de la période payée."""
    now = _now()
    subs = db.scalars(
        select(Subscription).where(
            Subscription.student_id == user.id, Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.expires_at > now,
        )
    ).all()
    if not subs:
        raise AppError(404, "NO_ACTIVE_SUBSCRIPTION", "Aucun abonnement actif à annuler")
    for sub in subs:
        sub.status = SubscriptionStatus.CANCELLED
        sub.cancelled_at = now
        sub.auto_renew = False
        _event(db, user, "subscription_cancelled", "subscription", sub.id)
    db.commit()
    return status_view(db, user)
