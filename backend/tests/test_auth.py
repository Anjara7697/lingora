import pytest
from fastapi import Depends
from sqlalchemy import select

from app.core.security import create_token
from app.main import app
from app.modules.identity.models import Permission, Role, User, UserRole, UserStatus
from app.shared.dependencies import require_roles

REGISTER = {
    "first_name": "Anjara",
    "last_name": "Rakoto",
    "email": "anjara@example.com",
    "password": "motdepasse1",
    "password_confirmation": "motdepasse1",
}


def register(client, **overrides):
    return client.post("/api/v1/auth/register", json={**REGISTER, **overrides})


def auth_header(resp) -> dict:
    return {"Authorization": f"Bearer {resp.json()['data']['tokens']['access_token']}"}


def test_register_creates_student_with_profile_and_tokens(client):
    r = register(client)
    assert r.status_code == 201
    data = r.json()["data"]
    assert data["user"]["role"] == "STUDENT" and data["user"]["status"] == "ACTIVE"
    assert data["user"]["profile"] is not None
    assert "password" not in str(data) and "password_hash" not in str(data)
    assert data["tokens"]["token_type"] == "bearer"


def test_register_cannot_choose_role(client):
    r = register(client, role="ADMIN")
    assert r.json()["data"]["user"]["role"] == "STUDENT"


def test_register_duplicate_email_case_insensitive(client):
    register(client)
    r = register(client, email="ANJARA@example.com")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_ALREADY_USED"


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "pas-un-email"},
        {"password": "court1", "password_confirmation": "court1"},
        {"password": "uniquementlettres", "password_confirmation": "uniquementlettres"},
        {"password_confirmation": "different1"},
        {"first_name": ""},
    ],
)
def test_register_validation_errors(client, overrides):
    r = register(client, **overrides)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert r.json()["data"] is None


def test_login_success_updates_last_login(client, db):
    register(client)
    r = client.post("/api/v1/auth/login", json={"email": "Anjara@Example.com", "password": "motdepasse1"})
    assert r.status_code == 200
    user = db.scalar(select(User).where(User.email == "anjara@example.com"))
    assert user.last_login_at is not None


def test_login_wrong_password_and_unknown_email_look_the_same(client):
    register(client)
    bad_pw = client.post("/api/v1/auth/login", json={"email": REGISTER["email"], "password": "faux"})
    unknown = client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "faux"})
    assert bad_pw.status_code == unknown.status_code == 401
    assert bad_pw.json() == unknown.json()


def test_login_suspended_account_refused(client, db):
    register(client)
    db.scalar(select(User)).status = UserStatus.SUSPENDED
    db.flush()
    r = client.post("/api/v1/auth/login", json={"email": REGISTER["email"], "password": "motdepasse1"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "ACCOUNT_DISABLED"


def test_me_requires_authentication(client):
    assert client.get("/api/v1/me").status_code == 401
    assert client.get("/api/v1/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_me_returns_current_user(client):
    h = auth_header(register(client))
    r = client.get("/api/v1/me", headers=h)
    assert r.status_code == 200 and r.json()["data"]["email"] == REGISTER["email"]


def test_refresh_token_cannot_be_used_as_access_token(client):
    tokens = register(client).json()["data"]["tokens"]
    r = client.get("/api/v1/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert r.status_code == 401


def test_refresh_issues_new_tokens_and_rejects_access_token(client):
    tokens = register(client).json()["data"]["tokens"]
    ok = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert ok.status_code == 200 and ok.json()["data"]["access_token"]
    bad = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert bad.status_code == 401


def test_update_profile(client):
    h = auth_header(register(client))
    r = client.patch(
        "/api/v1/me", headers=h, json={"first_name": "Nomena", "profile": {"city": "Antananarivo"}}
    )
    data = r.json()["data"]
    assert r.status_code == 200
    assert data["first_name"] == "Nomena" and data["profile"]["city"] == "Antananarivo"


def test_change_password(client):
    h = auth_header(register(client))
    wrong = client.post(
        "/api/v1/me/password", headers=h, json={"current_password": "x", "new_password": "nouveau123"}
    )
    assert wrong.status_code == 400
    ok = client.post(
        "/api/v1/me/password",
        headers=h,
        json={"current_password": "motdepasse1", "new_password": "nouveau123"},
    )
    assert ok.status_code == 204
    login = client.post("/api/v1/auth/login", json={"email": REGISTER["email"], "password": "nouveau123"})
    assert login.status_code == 200


ADMIN_ONLY = Depends(require_roles(UserRole.ADMIN))


def test_role_guard(client, db):
    @app.get("/_test/admin-only")
    def admin_only(_=ADMIN_ONLY):
        return {"ok": True}

    h = auth_header(register(client))
    assert client.get("/_test/admin-only", headers=h).status_code == 403
    db.scalar(select(User)).role = UserRole.ADMIN
    db.flush()
    assert client.get("/_test/admin-only", headers=h).status_code == 200


def test_expired_token_rejected(client, monkeypatch):
    from app.core import security

    monkeypatch.setattr(security.settings, "access_token_minutes", -1)
    user_id = register(client).json()["data"]["user"]["id"]
    r = client.get("/api/v1/me", headers={"Authorization": f"Bearer {create_token(user_id, 'access')}"})
    assert r.status_code == 401


def test_reference_data_seeded(db):
    assert {r.code for r in db.scalars(select(Role))} == {"STUDENT", "TEACHER", "ADMIN"}
    admin = db.scalar(select(Role).where(Role.code == "ADMIN"))
    assert {p.code for p in admin.permissions} == {p.code for p in db.scalars(select(Permission))}
