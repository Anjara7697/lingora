import pytest
from sqlalchemy import func, select

from app.modules.learning.models import Enrollment, EnrollmentStatus
from app.modules.platform.models import Event
from app.seed import seed_demo_content

START_ANSWERS = {  # solutions des 3 activités de « English Start / Hello! »
    "How do you say « Merci » in English?": 1,
    "Match the words.": {"Hello": "Bonjour", "Please": "S'il vous plaît", "Thank you": "Merci"},
    "Nice to ___ you.": "meet",
}


@pytest.fixture
def seeded(db):
    seed_demo_content(db)


@pytest.fixture
def auth(client, seeded):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Anjara", "last_name": "R", "email": "learn@example.com",
            "password": "motdepasse1", "password_confirmation": "motdepasse1",
        },
    )
    return {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}


def program(client, slug, headers=None):
    return client.get(f"/api/v1/programs/{slug}", headers=headers or {}).json()["data"]


def enroll(client, auth, slug):
    pid = program(client, slug)["program"]["id"]
    return client.post(f"/api/v1/programs/{pid}/enroll", headers=auth)


def first_lesson(client, slug):
    return program(client, slug)["courses"][0]["lessons"][0]["lesson"]["id"]


def submit(client, auth, activity_id, answer):
    r = client.post(
        f"/api/v1/activities/{activity_id}/submit", headers=auth, json={"answer": answer}
    )
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_catalogue_is_public(client, seeded):
    r = client.get("/api/v1/programs")
    items = {i["program"]["slug"]: i for i in r.json()["data"]}
    assert r.status_code == 200
    assert items["english-speaking"]["lesson_count"] == 3
    assert items["english-start"]["course_count"] == 1


def test_program_detail_public_and_unknown(client, seeded):
    d = program(client, "english-speaking")
    assert d["enrollment"] is None and len(d["courses"][0]["lessons"]) == 3
    assert client.get("/api/v1/programs/nope").json()["error"]["code"] == "PROGRAM_NOT_FOUND"


def test_lesson_needs_login_and_enrollment(client, auth):
    lesson_id = first_lesson(client, "english-start")
    assert client.get(f"/api/v1/lessons/{lesson_id}").status_code == 401
    r = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth)
    assert r.status_code == 403 and r.json()["error"]["code"] == "NOT_ENROLLED"


def test_enroll_is_idempotent(client, auth, db):
    a, b = enroll(client, auth, "english-start"), enroll(client, auth, "english-start")
    assert a.status_code == 201 and a.json()["data"]["id"] == b.json()["data"]["id"]
    assert db.scalar(select(func.count()).select_from(Enrollment)) == 1
    mine = client.get("/api/v1/me/enrollments", headers=auth).json()["data"]
    assert [m["program"]["slug"] for m in mine] == ["english-start"]


def test_lesson_detail_never_leaks_solutions(client, auth):
    enroll(client, auth, "english-speaking")
    lesson_id = first_lesson(client, "english-speaking")
    r = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth)
    body = r.text
    assert r.status_code == 200
    for secret in ("correct_answer", "correct_answers", "correct_order", "explanation", '"pairs"'):
        assert secret not in body
    data = r.json()["data"]
    assert len(data["contents"]) == 2 and len(data["activities"]) == 6
    matching = next(a for a in data["activities"] if a["activity"]["type"] == "MATCHING")
    assert matching["config"]["lefts"] and matching["config"]["rights"]


def test_lesson_of_another_program_is_forbidden(client, auth):
    lid = first_lesson(client, "english-start")
    enroll(client, auth, "english-speaking")  # inscrit à un AUTRE programme
    assert client.get(f"/api/v1/lessons/{lid}", headers=auth).status_code == 403


def test_wrong_then_right_answers_complete_lesson_and_program(client, auth, db):
    enroll(client, auth, "english-start")
    lesson_id = first_lesson(client, "english-start")
    detail = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth).json()["data"]
    acts = {a["activity"]["id"]: a for a in detail["activities"]}
    by_question = {a["config"]["question"]: aid for aid, a in acts.items()}

    wrong = submit(client, auth, by_question["How do you say « Merci » in English?"], 0)
    assert wrong["is_correct"] is False and float(wrong["score"]) == 0
    assert wrong["correct_answer"] == "Thank you" and wrong["lesson_progress"]["status"] == "IN_PROGRESS"
    assert wrong["lesson_completed"] is False

    results = [submit(client, auth, by_question[q], ans) for q, ans in START_ANSWERS.items()]
    assert all(r["is_correct"] for r in results)
    assert results[-1]["lesson_completed"] is True
    assert results[-1]["lesson_progress"]["status"] == "COMPLETED"

    again = submit(client, auth, by_question["Nice to ___ you."], "meet")
    assert again["lesson_completed"] is False  # déjà terminée : pas de double complétion

    program_state = program(client, "english-start", auth)
    assert program_state["enrollment"]["progress_percentage"] == "100.00"
    assert program_state["enrollment"]["status"] == "COMPLETED"
    assert program_state["courses"][0]["lessons"][0]["status"] == "COMPLETED"
    done_events = db.scalar(
        select(func.count()).select_from(Event).where(Event.event_name == "lesson_completed")
    )
    assert done_events == 1


def test_ungraded_speaking_activity_counts_once_attempted(client, auth):
    enroll(client, auth, "english-speaking")
    lesson_id = first_lesson(client, "english-speaking")
    detail = client.get(f"/api/v1/lessons/{lesson_id}", headers=auth).json()["data"]
    speaking = next(a for a in detail["activities"] if a["activity"]["type"] == "SPEAKING")
    assert speaking["graded"] is False
    res = submit(client, auth, speaking["activity"]["id"], None)
    assert res["graded"] is False and res["is_correct"] is None and res["score"] is None
    assert res["lesson_progress"]["progress_percentage"] == "16.67"  # 1 activité sur 6


def test_next_step_follows_progress(client, auth):
    assert client.get("/api/v1/me/next", headers=auth).json()["data"] is None
    enroll(client, auth, "english-speaking")
    step = client.get("/api/v1/me/next", headers=auth).json()["data"]
    assert step["lesson"]["slug"] == "se-presenter" and step["course"]["title"].startswith("Mois 1")


def test_oversized_answer_rejected(client, auth):
    enroll(client, auth, "english-start")
    detail = client.get(f"/api/v1/lessons/{first_lesson(client, 'english-start')}", headers=auth)
    aid = detail.json()["data"]["activities"][0]["activity"]["id"]
    r = client.post(
        f"/api/v1/activities/{aid}/submit", headers=auth, json={"answer": "x" * 6000}
    )
    assert r.status_code == 422


def test_reenroll_after_cancel_keeps_history(client, auth, db):
    enroll(client, auth, "english-start")
    e = db.scalar(select(Enrollment))
    e.status = EnrollmentStatus.CANCELLED
    db.flush()
    r = enroll(client, auth, "english-start")
    assert r.json()["data"]["status"] == "ACTIVE" and r.json()["data"]["id"] == str(e.id)
