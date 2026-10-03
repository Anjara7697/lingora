from datetime import timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

from app import cli
from app.modules.commerce.models import Payment
from app.modules.identity.models import User
from app.seed_billing import seed_billing

B = "/api/v1/billing"
A = "/api/v1/admin"


def register(client, email):
    r = client.post("/api/v1/auth/register", json={"first_name": "Ana", "last_name": email[:3], "email": email,
                    "password": "motdepasse1", "password_confirmation": "motdepasse1"})
    return {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}


@pytest.fixture
def world(client, db):
    seed_billing(db)
    cli.create_user(db, "boss@example.com", "ADMIN", "Admin-demo-1", "B", "Oss")
    r = client.post("/api/v1/auth/login", json={"email": "boss@example.com", "password": "Admin-demo-1"})
    admin = {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}
    return admin


def pay(client, h, success=True):
    pid = client.post(f"{B}/checkout", headers=h, json={"plan_slug": "premium-monthly"}).json()["data"]["payment_id"]
    client.post(f"{B}/payments/{pid}/demo-confirm", headers=h, json={"success": success})
    return pid


def test_empty_platform(client, world):
    d = client.get(f"{A}/billing/summary", headers=world).json()["data"]
    assert d["revenue"] == [] and d["active_paid"] == 0 and d["active_trials"] == 0
    assert d["payments_by_status"]["SUCCESS"] == 0
    assert client.get(f"{A}/payments", headers=world).json()["data"] == {"items": [], "total": 0}


def test_summary_counts_revenue_subscribers_and_trial_conversion(client, db, world):
    a, b, c = (register(client, f"{n}@example.com") for n in ("aaa", "bbb", "ccc"))
    pay(client, a)                       # abonné payant
    pay(client, b, success=False)        # échec : aucun revenu
    client.post(f"{B}/trial", headers=c)  # essai en cours
    pay(client, c)                       # ... puis achat : conversion (le paiement s'ajoute à l'essai)
    d = client.get(f"{A}/billing/summary", headers=world).json()["data"]
    mga = d["revenue"][0]
    assert mga["currency"] == "MGA" and Decimal(mga["total"]) == Decimal(30000) and mga["payments"] == 2
    assert Decimal(mga["last_30d"]) == Decimal(30000)
    assert d["active_paid"] == 2 and d["active_trials"] == 1
    assert d["trials_started"] == 1 and d["trials_converted"] == 1
    assert d["payments_by_status"]["SUCCESS"] == 2 and d["payments_by_status"]["FAILED"] == 1


def test_old_payments_leave_the_30_day_revenue(client, db, world):
    pay(client, register(client, "old@example.com"))
    p = db.scalar(select(Payment))
    p.paid_at = p.paid_at.replace(year=p.paid_at.year - 1)
    db.flush()
    mga = client.get(f"{A}/billing/summary", headers=world).json()["data"]["revenue"][0]
    assert Decimal(mga["total"]) == Decimal(15000) and Decimal(mga["last_30d"]) == 0


def test_payment_list_filter_and_pagination(client, db, world):
    for n in ("p1", "p2", "p3"):
        pay(client, register(client, f"{n}@example.com"), success=n != "p2")
    # une seule transaction de test : now() est identique partout, on espace donc les dates à la main
    for i, p in enumerate(db.scalars(select(Payment).join(User, User.id == Payment.student_id).order_by(User.email))):
        p.created_at = p.created_at + timedelta(minutes=i)
    db.flush()
    page = client.get(f"{A}/payments?limit=2", headers=world).json()["data"]
    assert page["total"] == 3 and len(page["items"]) == 2
    assert page["items"][0]["student_email"] == "p3@example.com"  # le plus récent d'abord
    failed = client.get(f"{A}/payments?status=FAILED", headers=world).json()["data"]
    assert failed["total"] == 1 and failed["items"][0]["student_email"] == "p2@example.com"
    assert client.get(f"{A}/payments?status=BOGUS", headers=world).status_code == 422
