"""Offres de démonstration (idempotent). Appelée par `python -m app.seed`.

⚠️ Prix provisoires : les prix sont des données (table `plans`), à fixer avant le lancement commercial.
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.commerce.models import Plan, PlanFeature

PLANS = [
    # (slug, nom, description, prix MGA, durée en jours, avantages affichés)
    ("premium-trial", "Essai gratuit", "7 jours de Premium offerts, une seule fois.", Decimal(0), 7, []),
    ("premium-monthly", "Premium mensuel", "Pratiquez l'oral bien plus qu'en formule gratuite, pendant 30 jours.",
     Decimal(15000), 30,
     [("speaking_extended", "Speaking Lab : bien plus d'analyses de votre voix chaque jour")]),
]


def seed_billing(db: Session) -> None:
    for slug, name, description, price, days, features in PLANS:
        plan = db.scalar(select(Plan).where(Plan.slug == slug))
        if plan is None:
            plan = Plan(slug=slug, name=name, description=description, price=price, currency="MGA", duration_days=days)
            db.add(plan)
            db.flush()
        for code, label in features:
            if not db.scalar(select(PlanFeature.id).where(PlanFeature.plan_id == plan.id, PlanFeature.code == code)):
                db.add(PlanFeature(plan_id=plan.id, code=code, name=label))
    db.commit()
