import logging
import re
import socket
import time
from datetime import UTC, datetime, timedelta
from email.header import decode_header, make_header

import jwt
import pytest
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Message
from sqlalchemy import select

from app.core import config
from app.core.config import Settings
from app.integrations import email as email_mod
from app.modules.identity.models import PasswordResetToken, User, UserRole
from app.modules.platform.models import AuditLog


def body_of(msg) -> str:
    return msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8")


EMAIL = "reset@example.com"
OLD, NEW = "motdepasse1", "Nouveau-mdp-2"


class Outbox:
    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to, subject, body):
        self.sent.append((to, subject, body))

    def token(self, index=-1) -> str:
        return re.search(r"token=([A-Za-z0-9_\-]+)", self.sent[index][2]).group(1)


@pytest.fixture
def outbox(monkeypatch):
    box = Outbox()
    monkeypatch.setattr(email_mod, "get_email_sender", lambda: box)
    return box


@pytest.fixture
def user(client):
    r = client.post("/api/v1/auth/register", json={
        "first_name": "Hery", "last_name": "R", "email": EMAIL, "password": OLD, "password_confirmation": OLD})
    return r.json()["data"]


def forgot(client, email=EMAIL):
    return client.post("/api/v1/auth/forgot-password", json={"email": email})


def reset(client, token, password=NEW, confirmation=None):
    return client.post("/api/v1/auth/reset-password", json={
        "token": token, "password": password, "password_confirmation": confirmation or password})


def login(client, password):
    return client.post("/api/v1/auth/login", json={"email": EMAIL, "password": password})


# ---------- demande de lien ----------


def test_same_answer_whether_the_account_exists_or_not(client, user, outbox):
    known, unknown = forgot(client), forgot(client, "nobody@example.com")
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()  # impossible de deviner quelles adresses sont inscrites
    assert [m[0] for m in outbox.sent] == [EMAIL]  # un seul email, pour le compte existant


def test_email_content_and_token_is_stored_hashed_only(client, db, user, outbox):
    forgot(client)
    to, subject, body = outbox.sent[0]
    token = outbox.token()
    assert to == EMAIL and "mot de passe" in subject.lower() and "Hery" in body
    assert f"{config.settings.app_base_url}/reset-password?token={token}" in body
    assert "30 minutes" in body
    rows = db.scalars(select(PasswordResetToken)).all()
    assert len(rows) == 1 and len(rows[0].token_hash) == 64 and token not in rows[0].token_hash
    assert token not in str([r.token_hash for r in rows])  # jamais le jeton en clair
    assert 29 * 60 < (rows[0].expires_at - datetime.now(UTC)).total_seconds() <= 30 * 60


def test_suspended_and_unknown_accounts_get_no_email(client, db, user, outbox):
    db.get(User, user["user"]["id"]).status = __import__("app.modules.identity.models", fromlist=["UserStatus"]).UserStatus.SUSPENDED
    db.flush()
    assert forgot(client).status_code == 202 and outbox.sent == []


def test_a_new_request_invalidates_the_previous_link(client, user, outbox):
    forgot(client)
    forgot(client)
    first, second = outbox.token(0), outbox.token(1)
    assert reset(client, first).status_code == 400
    assert reset(client, second).status_code == 200


def test_at_most_three_emails_per_hour_per_account(client, user, outbox):
    codes = [forgot(client).status_code for _ in range(5)]
    assert codes == [202] * 5  # même réponse : on ne révèle pas la limite
    assert len(outbox.sent) == 3


def test_email_failure_never_breaks_the_request(client, user, monkeypatch, caplog):
    class Broken:
        def send(self, *a):
            raise OSError("smtp down: secret-host")

    monkeypatch.setattr(email_mod, "get_email_sender", lambda: Broken())
    with caplog.at_level(logging.ERROR, logger="lingora.email"):
        assert forgot(client).status_code == 202
    assert "Échec d'envoi" in caplog.text


# ---------- réinitialisation ----------


def test_reset_changes_the_password_once(client, db, user, outbox):
    forgot(client)
    token = outbox.token()
    assert reset(client, token).status_code == 200
    assert login(client, NEW).status_code == 200 and login(client, OLD).status_code == 401
    again = reset(client, token, "Autre-mdp-3")
    assert again.status_code == 400 and again.json()["error"]["code"] == "INVALID_OR_EXPIRED_TOKEN"
    assert login(client, "Autre-mdp-3").status_code == 401
    assert "PASSWORD_RESET" in [a.action for a in db.scalars(select(AuditLog))]
    assert NEW not in str([a.new_values for a in db.scalars(select(AuditLog))])


def test_expired_and_unknown_tokens_are_rejected(client, db, user, outbox):
    forgot(client)
    token = outbox.token()
    db.scalar(select(PasswordResetToken)).expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.flush()
    assert reset(client, token).json()["error"]["code"] == "INVALID_OR_EXPIRED_TOKEN"
    assert reset(client, "x" * 43).json()["error"]["code"] == "INVALID_OR_EXPIRED_TOKEN"
    assert login(client, OLD).status_code == 200  # rien n'a changé


@pytest.mark.parametrize(("password", "confirmation"), [("court1", "court1"), ("uniquementlettres", "uniquementlettres"),
                                                        (NEW, "different-1")])
def test_invalid_new_password_is_rejected_and_the_link_stays_usable(client, user, outbox, password, confirmation):
    forgot(client)
    token = outbox.token()
    assert reset(client, token, password, confirmation).status_code == 422
    assert reset(client, "court").status_code == 422
    assert reset(client, token).status_code == 200


def test_reset_closes_every_existing_session(client, db, user, outbox):
    old_tokens = user["tokens"]
    h_old = {"Authorization": f"Bearer {old_tokens['access_token']}"}
    assert client.get("/api/v1/me", headers=h_old).status_code == 200
    forgot(client)
    reset(client, outbox.token())
    assert client.get("/api/v1/me", headers=h_old).status_code == 401
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": old_tokens["refresh_token"]}).status_code == 401
    fresh = login(client, NEW).json()["data"]["tokens"]  # une connexion faite juste après fonctionne
    assert client.get("/api/v1/me", headers={"Authorization": f"Bearer {fresh['access_token']}"}).status_code == 200
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": fresh["refresh_token"]}).status_code == 200


def test_a_token_issued_seconds_before_the_reset_is_revoked_deterministically(client, user, outbox):
    old = jwt.encode({"sub": user["user"]["id"], "type": "access", "iat": int(time.time()) - 100,
                      "exp": int(time.time()) + 1000}, config.settings.jwt_secret, algorithm="HS256")
    h = {"Authorization": f"Bearer {old}"}
    assert client.get("/api/v1/me", headers=h).status_code == 200
    forgot(client)
    reset(client, outbox.token())
    assert client.get("/api/v1/me", headers=h).status_code == 401


def test_admin_password_reset_also_closes_sessions(client, db, user):
    admin = client.post("/api/v1/auth/register", json={
        "first_name": "A", "last_name": "D", "email": "adm@example.com", "password": OLD, "password_confirmation": OLD}).json()["data"]
    db.get(User, admin["user"]["id"]).role = UserRole.ADMIN
    db.flush()
    h_admin = {"Authorization": f"Bearer {admin['tokens']['access_token']}"}
    h_user = {"Authorization": f"Bearer {user['tokens']['access_token']}"}
    assert client.get("/api/v1/me", headers=h_user).status_code == 200
    r = client.post(f"/api/v1/admin/users/{user['user']['id']}/password", headers=h_admin, json={"password": NEW})
    assert r.status_code == 204
    assert client.get("/api/v1/me", headers=h_user).status_code == 401
    assert client.get("/api/v1/me", headers=h_admin).status_code == 200  # l'admin garde sa session


def test_a_suspended_user_cannot_log_in_after_resetting(client, db, user, outbox):
    forgot(client)
    token = outbox.token()
    from app.modules.identity.models import UserStatus

    db.get(User, user["user"]["id"]).status = UserStatus.SUSPENDED
    db.flush()
    reset(client, token)
    assert login(client, NEW).status_code == 403


# ---------- envoi d'emails ----------


def test_console_backend_writes_the_message_to_the_logs(monkeypatch, caplog):
    logger = logging.getLogger("lingora.email")
    logger.addHandler(caplog.handler)
    try:
        with caplog.at_level(logging.INFO, logger="lingora.email"):
            email_mod.ConsoleEmailSender().send("a@example.com", "Sujet", "Lien : http://x/reset-password?token=abc")
    finally:
        logger.removeHandler(caplog.handler)
    assert "a@example.com" in caplog.text and "reset-password?token=abc" in caplog.text


@pytest.fixture
def smtp_server(monkeypatch):
    received = []

    class Collect(Message):
        def handle_message(self, message):
            received.append(message)

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    controller = Controller(Collect(), hostname="127.0.0.1", port=port)
    controller.start()
    for k, v in {"email_backend": "smtp", "smtp_host": "127.0.0.1", "smtp_port": port, "smtp_starttls": False,
                 "smtp_user": "", "email_from": "Lingora <no-reply@lingora.test>"}.items():
        monkeypatch.setattr(config.settings, k, v)
    yield received
    controller.stop()


def test_real_smtp_delivery_with_accents(smtp_server):
    email_mod.get_email_sender().send("eleve@example.com", "Réinitialisation de votre mot de passe", "Bonjour Hery,\nÉté à Madagascar\n")
    assert len(smtp_server) == 1
    msg = smtp_server[0]
    assert msg["To"] == "eleve@example.com" and "Lingora" in msg["From"]
    assert str(make_header(decode_header(msg["Subject"]))) == "Réinitialisation de votre mot de passe"
    assert "Été à Madagascar" in body_of(msg)


def test_full_flow_over_real_smtp(client, user, smtp_server):
    assert forgot(client).status_code == 202
    assert len(smtp_server) == 1
    body = body_of(smtp_server[0])
    token = re.search(r"token=([A-Za-z0-9_\-]+)", body).group(1)
    assert reset(client, token).status_code == 200 and login(client, NEW).status_code == 200


# ---------- configuration de production ----------


def test_production_refuses_the_console_email_backend_and_incomplete_smtp():
    strong = "s" * 40
    with pytest.raises(RuntimeError, match="EMAIL_BACKEND"):
        Settings(environment="production", jwt_secret=strong, email_backend="console").validate_for_runtime()
    with pytest.raises(RuntimeError, match="SMTP_HOST"):
        Settings(environment="production", jwt_secret=strong, email_backend="smtp", smtp_host="").validate_for_runtime()
    Settings(environment="production", jwt_secret=strong, email_backend="smtp", smtp_host="smtp.example.com").validate_for_runtime()
    Settings(environment="development", email_backend="console").validate_for_runtime()  # le dev reste simple
