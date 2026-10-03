from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.core import config
from app.integrations.ai import AIProviderError
from app.modules.learning.models import Skill
from app.modules.platform.models import Event
from app.modules.progress.models import SkillProgressHistory, SkillSourceType, StudentSkillProgress
from app.modules.speaking.models import MediaFile, SpeakingTurn
from app.seed_speaking import seed_speaking

GOOD = (
    "Hello, my name is Anjara and I am a junior developer. I studied computer science because I love "
    "solving problems, and I have built several web projects. I would like to join your company so I "
    "can learn from experienced developers."
)
POOR = "I am agree and she have a car"
AUDIO = b"\x1aE\xdf\xa3 fake webm bytes " * 20


@pytest.fixture(autouse=True)
def storage(tmp_path, monkeypatch):
    monkeypatch.setattr(config.settings, "storage_dir", str(tmp_path))
    return tmp_path


@pytest.fixture
def auth(client, db):
    seed_speaking(db)
    r = client.post(
        "/api/v1/auth/register",
        json={"first_name": "S", "last_name": "P", "email": "speak@example.com",
              "password": "motdepasse1", "password_confirmation": "motdepasse1"},
    )
    return {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}


def scenario_id(client, slug="job-interview"):
    items = client.get("/api/v1/speaking/scenarios").json()["data"]
    return next(s["id"] for s in items if s["slug"] == slug)


def new_session(client, auth, slug="job-interview"):
    r = client.post("/api/v1/speaking/sessions", headers=auth, json={"scenario_id": scenario_id(client, slug)})
    assert r.status_code == 201, r.text
    return r.json()["data"]["id"]


def send(client, auth, sid, transcript=GOOD, duration="12", mime="audio/webm;codecs=opus", audio=AUDIO):
    data = {"duration_seconds": duration}
    if transcript is not None:
        data["transcript"] = transcript
    return client.post(f"/api/v1/speaking/sessions/{sid}/turns", headers=auth, data=data,
                       files={"audio": ("rec.webm", audio, mime)})


def test_scenarios_are_public_and_published_only(client, auth):
    items = client.get("/api/v1/speaking/scenarios").json()["data"]
    assert len(items) == 6 and {"job-interview", "introduce-yourself"} <= {s["slug"] for s in items}


def test_session_requires_auth_and_is_resumed_not_duplicated(client, auth, db):
    sid = scenario_id(client)
    assert client.post("/api/v1/speaking/sessions", json={"scenario_id": sid}).status_code == 401
    assert new_session(client, auth) == new_session(client, auth)
    unknown = client.post("/api/v1/speaking/sessions", headers=auth,
                          json={"scenario_id": "00000000-0000-0000-0000-000000000000"})
    assert unknown.status_code == 404


def test_submit_turn_stores_audio_transcript_and_normalized_analysis(client, auth, db, storage):
    sid = new_session(client, auth)
    r = send(client, auth, sid)
    assert r.status_code == 201, r.text
    turn = r.json()["data"]
    assert turn["sequence_number"] == 1 and turn["transcript"] == GOOD and turn["transcript_simulated"] is True
    a = turn["analysis"]
    assert a["grammar"]["score"] == 100 and a["pronunciation"]["score"] is None
    assert turn["overall_score"] and "token=" in turn["audio_url"]
    media = db.scalar(select(MediaFile))
    assert media.mime_type == "audio/webm" and media.storage_provider == "LOCAL"
    assert (storage / media.storage_key).read_bytes() == AUDIO  # binaire hors base, métadonnées en base
    usage = db.scalar(select(Event).where(Event.event_name == "ai_usage"))
    assert usage.properties["provider"] == "demo" and usage.properties["cost_estimate_usd"] == 0.0


def test_signed_audio_url_works_only_with_a_valid_token_for_that_file(client, auth):
    sid = new_session(client, auth)
    url = send(client, auth, sid).json()["data"]["audio_url"]
    ok = client.get(url)
    assert ok.status_code == 200 and ok.content == AUDIO and ok.headers["content-type"] == "audio/webm"
    assert "no-store" in ok.headers["cache-control"]
    base = url.split("?")[0]
    assert client.get(base).status_code == 422  # jeton absent
    assert client.get(base + "?token=garbage").status_code == 401
    other = send(client, auth, sid).json()["data"]["audio_url"]
    assert client.get(base + "?token=" + other.split("token=")[1]).status_code == 401  # jeton d'un AUTRE fichier


def test_transcript_required_in_demo_mode_and_nothing_is_saved(client, auth, db, storage):
    sid = new_session(client, auth)
    for missing in (None, "   "):
        r = send(client, auth, sid, transcript=missing)
        assert r.status_code == 422 and r.json()["error"]["code"] == "TRANSCRIPT_REQUIRED"
    assert db.scalar(select(func.count()).select_from(MediaFile)) == 0
    assert not any(storage.rglob("*.webm"))


@pytest.mark.parametrize(
    ("kwargs", "status", "code"),
    [
        ({"mime": "text/plain"}, 415, "UNSUPPORTED_AUDIO"),
        ({"audio": b""}, 422, "EMPTY_AUDIO"),
        ({"duration": "0"}, 422, "INVALID_DURATION"),
        ({"duration": "9999"}, 422, "INVALID_DURATION"),
    ],
)
def test_upload_validation(client, auth, kwargs, status, code):
    r = send(client, auth, new_session(client, auth), **kwargs)
    assert r.status_code == status and r.json()["error"]["code"] == code


def test_audio_size_limit(client, auth, monkeypatch):
    monkeypatch.setattr(config.settings, "max_audio_bytes", 100)
    r = send(client, auth, new_session(client, auth), audio=b"x" * 500)
    assert r.status_code == 413 and r.json()["error"]["code"] == "AUDIO_TOO_LARGE"


def test_daily_limit_protects_ai_costs(client, auth, monkeypatch):
    monkeypatch.setattr(config.settings, "speaking_free_daily_limit", 2)
    sid = new_session(client, auth)
    assert send(client, auth, sid).status_code == 201 and send(client, auth, sid).status_code == 201
    r = send(client, auth, sid)
    assert r.status_code == 429 and r.json()["error"]["code"] == "DAILY_LIMIT_REACHED"
    assert client.get(f"/api/v1/speaking/sessions/{sid}", headers=auth).json()["data"]["attempts_left_today"] == 0


def test_ai_outage_is_a_friendly_503_and_leaves_no_trace(client, auth, db, storage, monkeypatch):
    class Broken:
        name, model = "broken", "x"

        def analyze(self, *a, **k):
            raise AIProviderError("boom: secret provider detail")

    from app.modules.speaking import service

    monkeypatch.setattr(service, "get_analyzer", lambda: Broken())
    r = send(client, auth, new_session(client, auth))
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_UNAVAILABLE"
    assert "secret" not in r.text  # l'erreur technique n'est jamais exposée
    assert db.scalar(select(func.count()).select_from(SpeakingTurn)) == 0
    assert not any(storage.rglob("*.webm"))


def test_sessions_are_private(client, auth):
    sid = new_session(client, auth)
    other = client.post("/api/v1/auth/register", json={
        "first_name": "O", "last_name": "T", "email": "o@example.com",
        "password": "motdepasse1", "password_confirmation": "motdepasse1"}).json()["data"]["tokens"]
    h = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.get(f"/api/v1/speaking/sessions/{sid}", headers=h).status_code == 404
    assert send(client, h, sid).status_code == 404
    assert client.post(f"/api/v1/speaking/sessions/{sid}/complete", headers=h).status_code == 404


def test_complete_needs_an_attempt_then_builds_feedback_and_progress(client, auth, db):
    sid = new_session(client, auth)
    early = client.post(f"/api/v1/speaking/sessions/{sid}/complete", headers=auth)
    assert early.status_code == 409 and early.json()["error"]["code"] == "NO_ATTEMPTS"

    send(client, auth, sid, transcript=POOR)
    send(client, auth, sid, transcript=GOOD)  # nouvelle tentative, meilleure
    done = client.post(f"/api/v1/speaking/sessions/{sid}/complete", headers=auth).json()["data"]
    fb = done["feedback"]
    assert done["session"]["status"] == "COMPLETED" and fb["attempts"] == 2
    assert fb["first_attempt_score"] < fb["last_attempt_score"]  # le progrès est mesurable
    assert "Bonne grammaire" in fb["strengths"]

    codes = {s.code: p.score for p, s in db.execute(
        select(StudentSkillProgress, Skill).join(Skill, Skill.id == StudentSkillProgress.skill_id))}
    assert set(codes) == {"SPEAKING", "GRAMMAR", "VOCABULARY", "FLUENCY"}
    hist = db.scalars(select(SkillProgressHistory).where(
        SkillProgressHistory.source_type == SkillSourceType.SPEAKING)).all()
    assert len(hist) == 4

    again = client.post(f"/api/v1/speaking/sessions/{sid}/complete", headers=auth)
    assert again.status_code == 200
    assert db.scalar(select(func.count()).select_from(SkillProgressHistory)) == 4  # idempotent
    closed = send(client, auth, sid)
    assert closed.status_code == 409 and closed.json()["error"]["code"] == "SESSION_CLOSED"


def test_session_score_is_smoothed_into_existing_skill_score(client, auth, db):
    user_id = client.get("/api/v1/me", headers=auth).json()["data"]["id"]
    skill = db.scalar(select(Skill).where(Skill.code == "GRAMMAR"))
    db.add(StudentSkillProgress(student_id=user_id, skill_id=skill.id, score=Decimal(50)))
    db.flush()
    sid = new_session(client, auth)
    send(client, auth, sid, transcript=GOOD)  # grammaire 100
    client.post(f"/api/v1/speaking/sessions/{sid}/complete", headers=auth)
    score = db.scalar(select(StudentSkillProgress.score).where(
        StudentSkillProgress.student_id == user_id, StudentSkillProgress.skill_id == skill.id))
    assert score == Decimal("65.00")  # 0.7 * 50 + 0.3 * 100 : une seule session ne fait pas basculer le score
