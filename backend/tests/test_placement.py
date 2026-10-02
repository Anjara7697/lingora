import pytest
from sqlalchemy import func, select

from app.modules.assessment.models import AssessmentAttempt, StudentLearningProfile
from app.modules.learning.models import CefrLevel
from app.modules.progress.models import SkillProgressHistory, StudentSkillProgress
from app.seed_placement import QUESTIONS, seed_placement


@pytest.fixture
def seeded(db):
    seed_placement(db)


def make_user(client, email="p@example.com"):
    r = client.post(
        "/api/v1/auth/register",
        json={"first_name": "P", "last_name": "T", "email": email,
              "password": "motdepasse1", "password_confirmation": "motdepasse1"},
    )
    return {"Authorization": f"Bearer {r.json()['data']['tokens']['access_token']}"}


@pytest.fixture
def auth(client, seeded):
    return make_user(client)


def start(client, auth):
    r = client.post("/api/v1/placement/start", headers=auth)
    assert r.status_code == 200, r.text
    return r.json()["data"]


def take_test(client, auth, correct_for):
    """Passe le test ; correct_for(skill, cefr) -> True/False. Retourne la réponse de /complete."""
    data = start(client, auth)
    for q, (skill, cefr, _, options, answer, _) in zip(data["questions"], QUESTIONS, strict=True):
        pick = answer if correct_for(skill, cefr) else (answer + 1) % len(options)
        r = client.put(f"/api/v1/placement/{data['attempt_id']}/answers/{q['id']}", headers=auth,
                       json={"answer": pick})
        assert r.status_code == 204, r.text
    return client.post(f"/api/v1/placement/{data['attempt_id']}/complete", headers=auth)


def test_requires_authentication(client, seeded):
    assert client.post("/api/v1/placement/start").status_code == 401


def test_start_returns_25_questions_without_any_hint(client, auth):
    data = client.post("/api/v1/placement/start", headers=auth).json()["data"]
    assert len(data["questions"]) == 25 and data["answers"] == {}
    for q in data["questions"]:
        assert set(q["config"]) == {"question", "options"}  # ni solution, ni niveau, ni compétence


def test_start_resumes_the_open_attempt(client, auth, db):
    a, b = start(client, auth), start(client, auth)
    assert a["attempt_id"] == b["attempt_id"]
    assert db.scalar(select(func.count()).select_from(AssessmentAttempt)) == 1


def test_answers_are_saved_and_can_change_and_resume(client, auth):
    data = start(client, auth)
    qid = data["questions"][0]["id"]
    put = lambda v: client.put(
        f"/api/v1/placement/{data['attempt_id']}/answers/{qid}", headers=auth, json={"answer": v}
    )
    assert put(0).status_code == 204 and put(2).status_code == 204
    assert start(client, auth)["answers"] == {qid: 2}


def test_cannot_complete_with_unanswered_questions(client, auth):
    data = start(client, auth)
    r = client.post(f"/api/v1/placement/{data['attempt_id']}/complete", headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "INCOMPLETE_ASSESSMENT"


def test_perfect_score_is_c1_and_recommends_speaking(client, auth, db):
    r = take_test(client, auth, lambda *_: True)
    res = r.json()["data"]
    assert r.status_code == 200
    assert res["overall_level"] == "C1" and float(res["overall_score"]) == 100.0
    assert {s["code"] for s in res["skills"]} == {"GRAMMAR", "VOCABULARY", "READING"}
    assert all(s["level"] == "C1" for s in res["skills"])
    assert res["recommended_program_slug"] in ("english-speaking", None)
    assert res["strongest"] is None and res["weakest"] is None  # scores identiques : pas d'écart à signaler


def test_all_wrong_is_a1(client, auth):
    res = take_test(client, auth, lambda *_: False).json()["data"]
    assert res["overall_level"] == "A1" and float(res["overall_score"]) == 0.0


def test_levels_are_per_skill_not_one_average(client, auth):
    levels = ["A1", "A2", "B1", "B2", "C1"]

    def correct(skill, cefr):  # grammaire forte (jusqu'à B2), vocabulaire faible (A1 seulement)
        limit = "B2" if skill == "GRAMMAR" else "A1" if skill == "VOCABULARY" else "B1"
        return levels.index(cefr) <= levels.index(limit)

    res = take_test(client, auth, correct).json()["data"]
    by_skill = {s["code"]: s["level"] for s in res["skills"]}
    assert by_skill == {"GRAMMAR": "B2", "VOCABULARY": "A1", "READING": "B1"}
    assert res["strongest"] == "GRAMMAR"


def test_completion_writes_profile_progress_and_history(client, auth, db):
    res = take_test(client, auth, lambda *_: True).json()["data"]
    profile = db.scalar(select(StudentLearningProfile))
    assert profile.current_level == CefrLevel.C1 and str(profile.placement_attempt_id) == res["attempt_id"]
    assert db.scalar(select(func.count()).select_from(StudentSkillProgress)) == 3
    assert db.scalar(select(func.count()).select_from(SkillProgressHistory)) == 3


def test_retake_keeps_history_and_updates_current_state(client, auth, db):
    first = take_test(client, auth, lambda *_: False).json()["data"]
    second = take_test(client, auth, lambda *_: True).json()["data"]
    assert first["attempt_id"] != second["attempt_id"]
    assert db.scalar(select(func.count()).select_from(AssessmentAttempt)) == 2
    assert db.scalar(select(func.count()).select_from(SkillProgressHistory)) == 6  # rien n'est écrasé
    assert db.scalar(select(func.count()).select_from(StudentSkillProgress)) == 3  # 1 ligne par compétence
    latest = client.get("/api/v1/placement/result", headers=auth).json()["data"]
    assert latest["attempt_id"] == second["attempt_id"] and latest["overall_level"] == "C1"
    old = client.get(f"/api/v1/placement/{first['attempt_id']}/result", headers=auth).json()["data"]
    assert old["overall_level"] == "A1"


def test_complete_is_idempotent_and_closed_attempt_rejects_answers(client, auth):
    data = start(client, auth)
    take = take_test(client, auth, lambda *_: True)
    again = client.post(f"/api/v1/placement/{data['attempt_id']}/complete", headers=auth)
    assert again.status_code == 200 and again.json()["data"] == take.json()["data"]
    qid = data["questions"][0]["id"]
    r = client.put(f"/api/v1/placement/{data['attempt_id']}/answers/{qid}", headers=auth, json={"answer": 0})
    assert r.status_code == 409 and r.json()["error"]["code"] == "ATTEMPT_CLOSED"


def test_no_result_yet_is_null(client, auth):
    assert client.get("/api/v1/placement/result", headers=auth).json()["data"] is None


def test_other_users_attempt_is_invisible(client, auth):
    data = start(client, auth)
    other = make_user(client, "other@example.com")
    qid = data["questions"][0]["id"]
    assert client.post(f"/api/v1/placement/{data['attempt_id']}/complete", headers=other).status_code == 404
    r = client.put(f"/api/v1/placement/{data['attempt_id']}/answers/{qid}", headers=other, json={"answer": 0})
    assert r.status_code == 404
    assert client.get(f"/api/v1/placement/{data['attempt_id']}/result", headers=other).status_code == 404


def test_question_bank_is_hidden_from_catalogue(client, auth):
    slugs = [p["program"]["slug"] for p in client.get("/api/v1/programs").json()["data"]]
    assert "placement-bank" not in slugs


def test_onboarding_roundtrip_and_validation(client, auth):
    assert client.get("/api/v1/me/onboarding", headers=auth).json()["data"] is None
    ok = client.put("/api/v1/me/onboarding", headers=auth,
                    json={"primary_goal": "PREPARE_INTERVIEW", "daily_minutes": 20})
    assert ok.status_code == 200
    client.put("/api/v1/me/onboarding", headers=auth, json={"primary_goal": "TRAVEL", "daily_minutes": 10})
    got = client.get("/api/v1/me/onboarding", headers=auth).json()["data"]
    assert got == {"primary_goal": "TRAVEL", "daily_minutes": 10}
    bad = client.put("/api/v1/me/onboarding", headers=auth, json={"primary_goal": "NOPE", "daily_minutes": 20})
    assert bad.status_code == 422
