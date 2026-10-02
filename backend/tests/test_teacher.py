from datetime import timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

from app import cli
from app.core import config
from app.modules.identity.models import User, UserRole
from app.modules.learning.models import Skill
from app.modules.progress.models import StudentSkillProgress
from app.modules.speaking.models import SpeakingFeedback
from app.modules.teacher import service
from app.modules.teacher.models import TeacherStudent
from app.modules.teacher.service import StudentStatus, classify
from app.seed import seed_demo_content
from app.seed_speaking import seed_speaking

NOW = service.datetime.now().astimezone()
D = timedelta
GOOD = ("Hello, my name is Anjara and I am a junior developer. I studied computer science because I love "
        "solving problems, and I have built several web projects.")


# ---------- règle de classification (pure) ----------


@pytest.mark.parametrize(
    ("idle_days", "speaking", "expected"),
    [
        (0, 80, StudentStatus.ON_TRACK),
        (6.9, 80, StudentStatus.ON_TRACK),
        (7, 80, StudentStatus.LOW_ACTIVITY),
        (13.9, 10, StudentStatus.LOW_ACTIVITY),   # l'inactivité prime sur la difficulté à l'oral
        (14, 80, StudentStatus.INACTIVE),
        (1, 49.9, StudentStatus.SPEAKING_DIFFICULTY),
        (1, 50, StudentStatus.ON_TRACK),
        (1, None, StudentStatus.ON_TRACK),        # pas de score oral = pas de jugement
    ],
)
def test_classify(idle_days, speaking, expected):
    assert classify(NOW - D(days=idle_days), speaking, NOW - D(days=60), NOW) == expected


def test_classify_students_without_any_activity():
    assert classify(None, None, NOW - D(days=2), NOW) == StudentStatus.NEW
    assert classify(None, None, NOW - D(days=8), NOW) == StudentStatus.INACTIVE


# ---------- helpers ----------


@pytest.fixture(autouse=True)
def storage(tmp_path, monkeypatch):
    monkeypatch.setattr(config.settings, "storage_dir", str(tmp_path))


def make_user(client, db, email, role=UserRole.STUDENT, first="Eleve"):
    r = client.post("/api/v1/auth/register", json={
        "first_name": first, "last_name": email.split("@")[0], "email": email,
        "password": "motdepasse1", "password_confirmation": "motdepasse1"})
    data = r.json()["data"]
    user = db.get(User, data["user"]["id"])
    user.role = role
    db.flush()
    return {"id": data["user"]["id"], "h": {"Authorization": f"Bearer {data['tokens']['access_token']}"}}


def assign(db, teacher, student):
    db.add(TeacherStudent(teacher_id=teacher["id"], student_id=student["id"]))
    db.flush()


@pytest.fixture
def world(client, db):
    seed_demo_content(db)
    seed_speaking(db)
    return {
        "teacher": make_user(client, db, "t1@example.com", UserRole.TEACHER, "Hanta"),
        "other_teacher": make_user(client, db, "t2@example.com", UserRole.TEACHER),
        "admin": make_user(client, db, "admin@example.com", UserRole.ADMIN),
        "s1": make_user(client, db, "s1@example.com"),
        "s2": make_user(client, db, "s2@example.com"),
    }


# ---------- accès ----------


def test_only_teachers_and_admins_can_use_the_teacher_api(client, world):
    assert client.get("/api/v1/teacher/dashboard").status_code == 401
    assert client.get("/api/v1/teacher/dashboard", headers=world["s1"]["h"]).status_code == 403
    assert client.get("/api/v1/teacher/students", headers=world["s1"]["h"]).status_code == 403
    assert client.get("/api/v1/teacher/dashboard", headers=world["teacher"]["h"]).status_code == 200


def test_empty_roster_dashboard(client, world):
    d = client.get("/api/v1/teacher/dashboard", headers=world["teacher"]["h"]).json()["data"]
    assert d["total_students"] == 0 and d["average_progress"] is None and d["needs_attention"] == []


def test_a_teacher_only_sees_assigned_students(client, db, world):
    assign(db, world["teacher"], world["s1"])
    assign(db, world["other_teacher"], world["s2"])
    t = world["teacher"]["h"]
    ids = [s["id"] for s in client.get("/api/v1/teacher/students", headers=t).json()["data"]]
    assert ids == [world["s1"]["id"]]
    mine = client.get(f"/api/v1/teacher/students/{world['s1']['id']}", headers=t)
    assert mine.status_code == 200
    # un élève d'un AUTRE enseignant : 404 partout, jamais 403 (on ne révèle pas son existence)
    other = world["s2"]["id"]
    assert client.get(f"/api/v1/teacher/students/{other}", headers=t).status_code == 404
    assert client.post(f"/api/v1/teacher/students/{other}/feedback", headers=t,
                       json={"comment": "x"}).status_code == 404
    assert client.get(f"/api/v1/teacher/students/{other}/speaking/{other}", headers=t).status_code == 404


def test_admin_sees_every_student(client, db, world):
    ids = {s["id"] for s in client.get("/api/v1/teacher/students", headers=world["admin"]["h"]).json()["data"]}
    assert {world["s1"]["id"], world["s2"]["id"]} <= ids
    assert world["teacher"]["id"] not in ids  # seulement des élèves


def test_search_and_status_filters(client, db, world, monkeypatch):
    assign(db, world["teacher"], world["s1"])
    assign(db, world["teacher"], world["s2"])
    monkeypatch.setattr(service, "_last_activity", lambda db_, ids: {
        __import__("uuid").UUID(world["s1"]["id"]): NOW - D(days=20)})
    t = world["teacher"]["h"]
    only_s1 = client.get("/api/v1/teacher/students?search=S1@", headers=t).json()["data"]
    assert [s["email"] for s in only_s1] == ["s1@example.com"]
    inactive = client.get("/api/v1/teacher/students?status=INACTIVE", headers=t).json()["data"]
    assert [s["email"] for s in inactive] == ["s1@example.com"]
    assert client.get("/api/v1/teacher/students?status=NOPE", headers=t).status_code == 422


def test_dashboard_counts_and_attention_order(client, db, world, monkeypatch):
    uuid = __import__("uuid")
    extra = [make_user(client, db, f"x{i}@example.com") for i in range(3)]
    everyone = [world["s1"], world["s2"], *extra]  # 5 élèves
    for s in everyone:
        assign(db, world["teacher"], s)
    speaking_skill = db.scalar(select(Skill).where(Skill.code == "SPEAKING"))
    db.add(StudentSkillProgress(student_id=extra[0]["id"], skill_id=speaking_skill.id, score=Decimal(30)))
    db.flush()
    last = {  # s1 actif, s2 faible activité, x0 difficulté à l'oral, x1 inactif, x2 jamais actif (nouveau)
        uuid.UUID(world["s1"]["id"]): NOW - D(days=1),
        uuid.UUID(world["s2"]["id"]): NOW - D(days=9),
        uuid.UUID(extra[0]["id"]): NOW - D(days=2),
        uuid.UUID(extra[1]["id"]): NOW - D(days=30),
    }
    monkeypatch.setattr(service, "_last_activity", lambda db_, ids: last)
    d = client.get("/api/v1/teacher/dashboard", headers=world["teacher"]["h"]).json()["data"]
    assert d["total_students"] == 5 and d["active_students"] == 2
    assert d["status_counts"] == {"NEW": 1, "ON_TRACK": 1, "LOW_ACTIVITY": 1, "SPEAKING_DIFFICULTY": 1, "INACTIVE": 1}
    assert [r["status"] for r in d["needs_attention"]] == ["INACTIVE", "LOW_ACTIVITY", "SPEAKING_DIFFICULTY"]


# ---------- parcours réel : l'élève travaille, l'enseignant suit et répond ----------


def student_works(client, h):
    pid = client.get("/api/v1/programs/english-start").json()["data"]["program"]["id"]
    client.post(f"/api/v1/programs/{pid}/enroll", headers=h)
    lesson = client.get("/api/v1/programs/english-start").json()["data"]["courses"][0]["lessons"][0]["lesson"]["id"]
    act = client.get(f"/api/v1/lessons/{lesson}", headers=h).json()["data"]["activities"][0]["activity"]["id"]
    client.post(f"/api/v1/activities/{act}/submit", headers=h, json={"answer": 0})  # mauvaise réponse
    scenario = client.get("/api/v1/speaking/scenarios").json()["data"][0]["id"]
    sid = client.post("/api/v1/speaking/sessions", headers=h, json={"scenario_id": scenario}).json()["data"]["id"]
    client.post(f"/api/v1/speaking/sessions/{sid}/turns", headers=h, data={"duration_seconds": "20", "transcript": GOOD},
                files={"audio": ("a.webm", b"audio-bytes" * 10, "audio/webm")})
    client.post(f"/api/v1/speaking/sessions/{sid}/complete", headers=h)
    return sid


def test_student_detail_shows_real_activity(client, db, world):
    assign(db, world["teacher"], world["s1"])
    sid = student_works(client, world["s1"]["h"])
    d = client.get(f"/api/v1/teacher/students/{world['s1']['id']}", headers=world["teacher"]["h"]).json()["data"]
    assert d["status"] == "ON_TRACK" and d["last_activity_at"]
    assert d["enrollments"][0]["program_slug"] == "english-start"
    assert d["recent_attempts"][0]["is_correct"] is False
    assert {s["code"] for s in d["skills"]} >= {"SPEAKING", "GRAMMAR"}
    assert d["speaking_sessions"][0]["id"] == sid and d["speaking_sessions"][0]["attempts"] == 1
    assert "password" not in str(d)


def test_teacher_reviews_a_speaking_session_with_audio_and_transcript(client, db, world):
    assign(db, world["teacher"], world["s1"])
    sid = student_works(client, world["s1"]["h"])
    r = client.get(f"/api/v1/teacher/students/{world['s1']['id']}/speaking/{sid}", headers=world["teacher"]["h"])
    d = r.json()["data"]
    assert r.status_code == 200 and d["turns"][0]["transcript"] == GOOD
    audio = client.get(d["turns"][0]["audio_url"])
    assert audio.status_code == 200 and audio.content.startswith(b"audio-bytes")
    assert d["student"]["id"] == world["s1"]["id"] and d["feedback"]["attempts"] == 1


def test_feedback_notifies_the_student_and_validates_the_ai_feedback(client, db, world):
    assign(db, world["teacher"], world["s1"])
    sid = student_works(client, world["s1"]["h"])
    t, s = world["teacher"]["h"], world["s1"]["h"]
    url = f"/api/v1/teacher/students/{world['s1']['id']}/feedback"
    r = client.post(url, headers=t, json={"comment": "Très bien ! Travaillez la fluidité.", "score": 78,
                                          "speaking_session_id": sid})
    assert r.status_code == 201 and r.json()["data"]["teacher_name"] == "Hanta t1"

    ai = db.scalar(select(SpeakingFeedback))
    assert str(ai.reviewed_by) == world["teacher"]["id"]  # l'enseignant garde le contrôle pédagogique

    notifs = client.get("/api/v1/me/notifications", headers=s).json()
    assert notifs["meta"]["unread"] == 1 and "Hanta" in notifs["data"][0]["title"]
    mine = client.get("/api/v1/me/teacher-feedback", headers=s).json()["data"]
    assert mine[0]["comment"].startswith("Très bien") and float(mine[0]["score"]) == 78
    nid = notifs["data"][0]["id"]
    assert client.post(f"/api/v1/me/notifications/{nid}/read", headers=s).status_code == 204
    assert client.get("/api/v1/me/notifications", headers=s).json()["meta"]["unread"] == 0
    # les notifications d'un élève sont invisibles pour un autre
    other = world["s2"]["h"]
    assert client.get("/api/v1/me/notifications", headers=other).json()["data"] == []
    assert client.post(f"/api/v1/me/notifications/{nid}/read", headers=other).status_code == 404


@pytest.mark.parametrize("body", [
    {"comment": ""}, {"comment": "   x" * 1000}, {"comment": "ok", "score": 101}, {"comment": "ok", "score": -1},
])
def test_feedback_validation(client, db, world, body):
    assign(db, world["teacher"], world["s1"])
    r = client.post(f"/api/v1/teacher/students/{world['s1']['id']}/feedback", headers=world["teacher"]["h"], json=body)
    assert r.status_code == 422


def test_feedback_cannot_target_another_students_session(client, db, world):
    assign(db, world["teacher"], world["s1"])
    assign(db, world["teacher"], world["s2"])
    sid = student_works(client, world["s2"]["h"])
    r = client.post(f"/api/v1/teacher/students/{world['s1']['id']}/feedback", headers=world["teacher"]["h"],
                    json={"comment": "x", "speaking_session_id": sid})
    assert r.status_code == 404 and r.json()["error"]["code"] == "SESSION_NOT_FOUND"


def test_mark_all_notifications_read(client, db, world):
    assign(db, world["teacher"], world["s1"])
    for i in range(3):
        client.post(f"/api/v1/teacher/students/{world['s1']['id']}/feedback", headers=world["teacher"]["h"],
                    json={"comment": f"note {i}"})
    s = world["s1"]["h"]
    assert client.get("/api/v1/me/notifications", headers=s).json()["meta"]["unread"] == 3
    assert client.post("/api/v1/me/notifications/read-all", headers=s).status_code == 204
    assert client.get("/api/v1/me/notifications", headers=s).json()["meta"]["unread"] == 0


# ---------- CLI d'administration ----------


def test_cli_create_user_and_assign(client, db, world):
    t = db.get(User, world["teacher"]["id"])
    s = db.get(User, world["s1"]["id"])
    assert cli._assign(db, t, s) is True and cli._assign(db, t, s) is False  # idempotent
    with pytest.raises(SystemExit):
        cli._assign(db, s, t)  # un élève ne peut pas être « enseignant »
    with pytest.raises(SystemExit):
        cli._assign(db, t, t)  # ni s'assigner soi-même comme élève


def test_cli_create_user_hashes_password_and_rejects_duplicates(client, db):
    u = cli.create_user(db, "new.teacher@example.com", "TEACHER", "Secret-123", "N", "T")
    assert u.role == UserRole.TEACHER and u.password_hash.startswith("$argon2")
    login = client.post("/api/v1/auth/login", json={"email": "new.teacher@example.com", "password": "Secret-123"})
    assert login.status_code == 200 and login.json()["data"]["user"]["role"] == "TEACHER"
    with pytest.raises(SystemExit):
        cli.create_user(db, "NEW.teacher@example.com", "TEACHER", "Secret-123", "N", "T")


def test_demo_staff_accounts_can_actually_log_in(client, db):
    from app.seed import DEMO_STAFF, seed_demo_staff

    seed_demo_staff(db)
    seed_demo_staff(db)  # idempotent
    for email, role, password, *_ in DEMO_STAFF:
        r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, f"{email}: {r.text}"
        assert r.json()["data"]["user"]["role"] == role


def test_demo_staff_is_never_created_outside_development(db, monkeypatch):
    from app.seed import seed_demo_staff

    monkeypatch.setattr(config.settings, "environment", "production")
    seed_demo_staff(db)
    assert db.scalar(select(User).where(User.email == "teacher.demo@example.com")) is None
