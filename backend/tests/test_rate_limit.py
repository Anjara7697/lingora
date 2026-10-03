import pytest

from app.core import config
from app.core.rate_limit import SlidingWindowLimiter

CREDS = {"email": "rl@example.com", "password": "mauvais-mdp-1"}


def test_sliding_window_counts_only_recent_hits():
    lim = SlidingWindowLimiter()
    assert [lim.hit("k", 3, 60, now=t)[0] for t in (0, 10, 20)] == [True, True, True]
    ok, retry = lim.hit("k", 3, 60, now=30)
    assert ok is False and retry == 31  # la plus ancienne (t=0) sort de la fenêtre à t=60
    assert lim.hit("k", 3, 60, now=60)[0] is True  # t=0 est sorti de la fenêtre
    assert lim.hit("other", 3, 60, now=30)[0] is True  # clés indépendantes


def test_old_keys_are_pruned():
    lim = SlidingWindowLimiter()
    for i in range(20_005):
        lim.hit(f"k{i}", 1, 10, now=0)
    lim.hit("fresh", 1, 10, now=100)
    assert len(lim._hits) < 20_005


@pytest.fixture
def limited(client, rate_limited):
    return client


def test_login_is_throttled_per_account_with_retry_after(limited):
    codes = [limited.post("/api/v1/auth/login", json=CREDS).status_code for _ in range(8)]
    assert codes == [401] * 8
    r = limited.post("/api/v1/auth/login", json=CREDS)
    assert r.status_code == 429 and r.json()["error"]["code"] == "TOO_MANY_REQUESTS"
    assert 1 <= int(r.headers["Retry-After"]) <= 61 and "seconde" in r.json()["error"]["message"]
    # un AUTRE compte depuis la même adresse n'est pas bloqué
    assert limited.post("/api/v1/auth/login", json={**CREDS, "email": "other@example.com"}).status_code == 401


def test_a_correct_password_is_also_blocked_while_throttled(limited):
    limited.post("/api/v1/auth/register", json={"first_name": "A", "last_name": "B", "email": "rl@example.com",
                                                "password": "bonmdp-123", "password_confirmation": "bonmdp-123"})
    for _ in range(8):
        limited.post("/api/v1/auth/login", json=CREDS)
    good = limited.post("/api/v1/auth/login", json={"email": "rl@example.com", "password": "bonmdp-123"})
    assert good.status_code == 429  # sinon un attaquant pourrait continuer à deviner pendant le blocage


def test_forgot_password_is_throttled_per_address(limited):
    codes = [limited.post("/api/v1/auth/forgot-password", json={"email": "x@example.com"}).status_code for _ in range(4)]
    assert codes == [202, 202, 202, 429]
    assert limited.post("/api/v1/auth/forgot-password", json={"email": "y@example.com"}).status_code == 202


def test_reset_password_attempts_are_throttled_per_ip(limited):
    body = {"token": "t" * 43, "password": "Nouveau-123", "password_confirmation": "Nouveau-123"}
    codes = [limited.post("/api/v1/auth/reset-password", json=body).status_code for _ in range(11)]
    assert codes[:10] == [400] * 10 and codes[10] == 429


def test_register_is_throttled_per_ip(limited):
    def reg(i):
        return limited.post("/api/v1/auth/register", json={"first_name": "A", "last_name": "B", "email": f"u{i}@example.com",
                                                          "password": "bonmdp-123", "password_confirmation": "bonmdp-123"}).status_code
    codes = [reg(i) for i in range(11)]
    assert codes[:10] == [201] * 10 and codes[10] == 429


def test_spoofed_forwarded_header_cannot_bypass_the_limit_by_default(limited):
    for i in range(8):
        limited.post("/api/v1/auth/login", json=CREDS, headers={"X-Forwarded-For": f"10.0.0.{i}"})
    r = limited.post("/api/v1/auth/login", json=CREDS, headers={"X-Forwarded-For": "99.99.99.99"})
    assert r.status_code == 429  # X-Forwarded-For ignoré tant que le proxy n'est pas déclaré de confiance


def test_forwarded_header_is_honoured_behind_a_trusted_proxy(limited, monkeypatch):
    monkeypatch.setattr(config.settings, "trust_proxy_headers", True)
    for _ in range(8):
        limited.post("/api/v1/auth/login", json=CREDS, headers={"X-Forwarded-For": "1.1.1.1, 10.0.0.1"})
    assert limited.post("/api/v1/auth/login", json=CREDS, headers={"X-Forwarded-For": "1.1.1.1"}).status_code == 429
    # un autre client (autre IP réelle) a son propre compteur
    assert limited.post("/api/v1/auth/login", json={**CREDS, "email": "z@example.com"},
                        headers={"X-Forwarded-For": "2.2.2.2"}).status_code == 401
