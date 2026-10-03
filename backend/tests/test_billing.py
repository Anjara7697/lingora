import json
from datetime import timedelta

import pytest
from sqlalchemy import select

from app import cli
from app.core import config
from app.integrations.payment.demo import sign
from app.modules.commerce import service
from app.modules.commerce.models import Payment, PaymentStatus, Subscription, SubscriptionStatus
from app.modules.platform.models import Event
from app.seed_billing import seed_billing
from app.seed_speaking import seed_speaking

GOOD = "Hello, my name is Anjara and I am a junior developer. I have built several web projects."
AUDIO = b"\x1aE\xdf\xa3 fake webm bytes " * 20
B = "/api/v1/billing"


@pytest.fixture(autouse=True)
def storage(tmp_path, monkeypatch):
    monkeypatch.setattr(config.settings, "storage_dir", str(tmp_path))


def register(client, email="eleve@example.com"):
    r = client.post("/api/v1/auth/register", json={"first_name": "E", "last_name": "L", "email": email,
                    "password": "motdepasse1", "password_confirmation": "motdepasse1"})
    return {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}


@pytest.fixture
def auth(client, db):
    seed_billing(db)
    seed_speaking(db)
    return register(client)


def me(client, auth):
    return client.get(f"{B}/me", headers=auth).json()["data"]


def buy(client, auth):
    r = client.post(f"{B}/checkout", headers=auth, json={"plan_slug": "premium-monthly"})
    assert r.status_code == 201, r.text
    return r.json()["data"]["payment_id"]


def confirm(client, auth, payment_id, success=True):
    return client.post(f"{B}/payments/{payment_id}/demo-confirm", headers=auth, json={"success": success})


def test_seed_is_idempotent_and_plans_hide_the_trial(client, db, auth):
    seed_billing(db)
    plans = client.get(f"{B}/plans").json()["data"]
    assert [p["slug"] for p in plans] == ["premium-monthly"]
    assert plans[0]["price"] == "15000.00" and plans[0]["features"]


def test_free_student_status(client, auth):
    data = me(client, auth)
    assert data["is_premium"] is False and data["trial_available"] is True
    assert data["speaking_daily_limit"] == config.settings.speaking_free_daily_limit


def test_billing_requires_authentication(client):
    assert client.get(f"{B}/me").status_code == 401
    assert client.post(f"{B}/trial").status_code == 401


def test_trial_unlocks_premium_once(client, auth):
    r = client.post(f"{B}/trial", headers=auth)
    data = r.json()["data"]
    assert r.status_code == 200 and data["is_premium"] and data["is_trial"] and data["trial_available"] is False
    assert data["speaking_daily_limit"] == config.settings.speaking_daily_limit
    assert client.post(f"{B}/trial", headers=auth).json()["error"]["code"] == "ALREADY_PREMIUM"


def test_trial_cannot_be_reused_after_it_ends(client, db, auth):
    client.post(f"{B}/trial", headers=auth)
    sub = db.scalar(select(Subscription))
    sub.expires_at = sub.expires_at - timedelta(days=30)
    db.flush()
    data = me(client, auth)
    assert data["is_premium"] is False and data["trial_available"] is False
    r = client.post(f"{B}/trial", headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "TRIAL_ALREADY_USED"


def test_checkout_does_not_grant_access_before_payment(client, auth):
    pid = buy(client, auth)
    assert me(client, auth)["is_premium"] is False
    pay = client.get(f"{B}/payments", headers=auth).json()["data"]
    assert pay[0]["id"] == pid and pay[0]["status"] == "PENDING"


def test_successful_payment_activates_premium(client, db, auth):
    pid = buy(client, auth)
    data = confirm(client, auth, pid).json()["data"]
    assert data["is_premium"] and not data["is_trial"] and data["plan_name"] == "Premium mensuel"
    sub = db.scalar(select(Subscription).where(Subscription.status == SubscriptionStatus.ACTIVE))
    assert (sub.expires_at - sub.started_at).days in (29, 30)
    names = {e.event_name for e in db.scalars(select(Event))}
    assert {"checkout_started", "payment_succeeded", "subscription_activated"} <= names


def test_failed_payment_grants_nothing(client, db, auth):
    pid = buy(client, auth)
    assert confirm(client, auth, pid, success=False).json()["data"]["is_premium"] is False
    assert db.scalar(select(Payment)).status == PaymentStatus.FAILED
    assert db.scalar(select(Subscription)).status == SubscriptionStatus.CANCELLED
    assert confirm(client, auth, pid).json()["data"]["is_premium"] is False  # un paiement échoué ne se rejoue pas


def test_confirming_twice_does_not_extend_twice(client, db, auth):
    pid = buy(client, auth)
    confirm(client, auth, pid)
    first = db.scalar(select(Subscription)).expires_at
    confirm(client, auth, pid)
    assert db.scalar(select(Subscription)).expires_at == first


def test_renewal_adds_to_the_remaining_period(client, db, auth):
    confirm(client, auth, buy(client, auth))
    first = db.scalars(select(Subscription).order_by(Subscription.created_at)).first().expires_at
    confirm(client, auth, buy(client, auth))
    assert max(s.expires_at for s in db.scalars(select(Subscription))) - first == timedelta(days=30)


def test_cancel_keeps_access_until_the_end(client, auth):
    confirm(client, auth, buy(client, auth))
    data = client.post(f"{B}/cancel", headers=auth).json()["data"]
    assert data["is_premium"] and data["cancelled"] is True
    r = client.post(f"{B}/cancel", headers=auth)
    assert r.status_code == 404 and r.json()["error"]["code"] == "NO_ACTIVE_SUBSCRIPTION"


def test_expired_subscription_loses_access(client, db, auth):
    confirm(client, auth, buy(client, auth))
    sub = db.scalar(select(Subscription))
    sub.expires_at = service._now() - timedelta(seconds=1)
    db.flush()
    assert me(client, auth)["is_premium"] is False


def test_unknown_plan_and_trial_plan_cannot_be_bought(client, auth):
    for slug in ("nope", "premium-trial"):
        r = client.post(f"{B}/checkout", headers=auth, json={"plan_slug": slug})
        assert r.status_code == 404 and r.json()["error"]["code"] == "PLAN_NOT_FOUND"


def test_a_student_cannot_confirm_someone_elses_payment(client, auth):
    pid = buy(client, auth)
    other = register(client, "autre@example.com")
    assert confirm(client, other, pid).status_code == 404


def test_demo_confirmation_is_disabled_in_production(client, auth, monkeypatch):
    pid = buy(client, auth)
    monkeypatch.setattr(config.settings, "environment", "production")
    r = confirm(client, auth, pid)
    assert r.status_code == 403 and r.json()["error"]["code"] == "DEMO_ONLY"


def test_staff_are_never_limited_and_cannot_subscribe(client, db):
    seed_billing(db)
    cli.create_user(db, "prof@example.com", "TEACHER", "Prof-demo-1", "P", "T")
    r = client.post("/api/v1/auth/login", json={"email": "prof@example.com", "password": "Prof-demo-1"})
    auth = {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}
    data = me(client, auth)
    assert data["is_premium"] and data["trial_available"] is False
    assert client.post(f"{B}/trial", headers=auth).json()["error"]["code"] == "STUDENT_ONLY"


# ---------- webhook signé ----------


def webhook(client, tx, status="SUCCESS", signature=None, raw=None):
    body = raw if raw is not None else json.dumps({"transaction_id": tx, "status": status}).encode()
    headers = {"X-Lingora-Signature": signature if signature is not None else sign(body)}
    return client.post(f"{B}/webhooks/demo", content=body, headers=headers)


def test_webhook_activates_and_is_idempotent(client, db, auth):
    buy(client, auth)
    tx = db.scalar(select(Payment)).provider_transaction_id
    assert webhook(client, tx).status_code == 200
    assert me(client, auth)["is_premium"]
    expires = db.scalar(select(Subscription)).expires_at
    assert webhook(client, tx).status_code == 200  # rejeu : aucun effet
    assert db.scalar(select(Subscription)).expires_at == expires


def test_webhook_rejects_bad_signatures_and_payloads(client, db, auth):
    buy(client, auth)
    tx = db.scalar(select(Payment)).provider_transaction_id
    assert webhook(client, tx, signature="0" * 64).json()["error"]["code"] == "INVALID_WEBHOOK"
    assert webhook(client, tx, signature="").status_code == 400
    assert webhook(client, tx, raw=b"not json").status_code == 400  # signature valide mais contenu illisible
    assert client.post(f"{B}/webhooks/unknown", content=b"{}").status_code == 400
    assert me(client, auth)["is_premium"] is False


def test_webhook_unknown_transaction(client, auth):
    assert webhook(client, "demo_missing").json()["error"]["code"] == "PAYMENT_NOT_FOUND"


# ---------- effet sur le Speaking Lab ----------


def speak(client, auth, sid):
    return client.post(f"/api/v1/speaking/sessions/{sid}/turns", headers=auth, data={"duration_seconds": "12", "transcript": GOOD},
                       files={"audio": ("rec.webm", AUDIO, "audio/webm")})


def test_premium_raises_the_speaking_limit(client, auth, monkeypatch):
    monkeypatch.setattr(config.settings, "speaking_free_daily_limit", 1)
    monkeypatch.setattr(config.settings, "speaking_daily_limit", 3)
    scenario = client.get("/api/v1/speaking/scenarios").json()["data"][0]["id"]
    sid = client.post("/api/v1/speaking/sessions", headers=auth, json={"scenario_id": scenario}).json()["data"]["id"]
    assert speak(client, auth, sid).status_code == 201
    r = speak(client, auth, sid)
    assert r.status_code == 429 and "Premium" in r.json()["error"]["message"]
    client.post(f"{B}/trial", headers=auth)
    assert speak(client, auth, sid).status_code == 201 and speak(client, auth, sid).status_code == 201
    r = speak(client, auth, sid)
    assert r.status_code == 429 and "Premium" not in r.json()["error"]["message"]
