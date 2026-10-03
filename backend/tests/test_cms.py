import pytest
from sqlalchemy import func, select

from app.modules.identity.models import User, UserRole
from app.modules.learning.models import (
    Activity,
    ActivityAttempt,
    ActivityType,
    Difficulty,
    Enrollment,
    Program,
)
from app.modules.platform.models import AuditLog
from app.modules.speaking.models import SpeakingScenarioSkill
from app.seed import seed_demo_content
from app.seed_placement import seed_placement
from app.seed_speaking import seed_speaking

MCQ = {"question": "I ___ a student", "options": ["am", "is", "are"], "correct_answer": 0, "explanation": "I -> am"}


def make_user(client, db, email, role=UserRole.STUDENT):
    r = client.post("/api/v1/auth/register", json={
        "first_name": "P", "last_name": email.split("@")[0], "email": email,
        "password": "motdepasse1", "password_confirmation": "motdepasse1"})
    data = r.json()["data"]
    db.get(User, data["user"]["id"]).role = role
    db.flush()
    return {"id": data["user"]["id"], "h": {"Authorization": f"Bearer {data['tokens']['access_token']}"}}


@pytest.fixture
def w(client, db):
    return {
        "teacher": make_user(client, db, "t@example.com", UserRole.TEACHER),
        "admin": make_user(client, db, "a@example.com", UserRole.ADMIN),
        "student": make_user(client, db, "s@example.com"),
    }


class Cms:
    def __init__(self, client, h):
        self.c, self.h = client, h

    def req(self, method, path, **kw):
        return getattr(self.c, method)(f"/api/v1/cms{path}", headers=self.h, **kw)

    def ok(self, method, path, status=200, **kw):
        r = self.req(method, path, **kw)
        assert r.status_code == status, f"{method} {path}: {r.status_code} {r.text}"
        return r.json()["data"] if r.content else None

    def program(self, name="Anglais Débutant"):
        return self.ok("post", "/programs", 201, json={"name": name, "difficulty": "BEGINNER"})

    def course(self, pid, title="Cours 1"):
        return self.ok("post", f"/programs/{pid}/courses", 201, json={"title": title, "difficulty": "BEGINNER"})

    def lesson(self, cid, title="Leçon 1"):
        return self.ok("post", f"/courses/{cid}/lessons", 201, json={"title": title})

    def activity(self, lid, config=None, title="Q1", type_="MCQ"):
        return self.ok("post", f"/lessons/{lid}/activities", 201,
                       json={"type": type_, "title": title, "configuration": config or MCQ})


@pytest.fixture
def cms(client, w):
    return Cms(client, w["teacher"]["h"])


def build_publishable(cms):
    p = cms.program()
    c = cms.course(p["id"])
    ls = cms.lesson(c["id"])
    cms.activity(ls["id"])
    return p, c, ls


# ---------- accès ----------


@pytest.mark.parametrize(("method", "path"), [("get", "/programs"), ("get", "/scenarios"), ("post", "/programs")])
def test_cms_requires_content_permissions(client, w, method, path):
    call = getattr(client, method)
    assert call(f"/api/v1/cms{path}").status_code == 401
    assert call(f"/api/v1/cms{path}", headers=w["student"]["h"]).status_code == 403  # un élève n'édite rien
    assert call(f"/api/v1/cms{path}", headers=w["teacher"]["h"]).status_code != 403
    assert call(f"/api/v1/cms{path}", headers=w["admin"]["h"]).status_code != 403


def test_system_placement_bank_is_invisible_and_untouchable(client, db, w, cms):
    seed_placement(db)
    assert "placement-bank" not in [x["program"]["slug"] for x in cms.ok("get", "/programs")]
    bank = db.scalar(select(Program).where(Program.slug == "placement-bank"))
    assert cms.req("get", f"/programs/{bank.id}").status_code == 404
    assert cms.req("delete", f"/programs/{bank.id}").status_code == 404


# ---------- slugs ----------


def test_slug_generation_and_conflicts(cms):
    a, b = cms.program("Anglais Débutant"), cms.program("Anglais Débutant")
    assert (a["slug"], b["slug"]) == ("anglais-debutant", "anglais-debutant-2")
    dup = cms.req("post", "/programs", json={"name": "X", "slug": "anglais-debutant", "difficulty": "BEGINNER"})
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "SLUG_TAKEN"
    bad = cms.req("post", "/programs", json={"name": "X", "slug": "Pas Valide!", "difficulty": "BEGINNER"})
    assert bad.status_code == 422
    # un slug de cours n'a besoin d'être unique que dans son programme
    c1 = cms.course(a["id"], "Les bases")
    c2 = cms.course(b["id"], "Les bases")
    assert c1["slug"] == c2["slug"] == "les-bases"


# ---------- de la création à l'élève ----------


def test_authoring_flow_reaches_the_learner_and_can_be_completed(client, db, w, cms):
    p, c, ls = build_publishable(cms)
    cms.ok("post", f"/lessons/{ls['id']}/contents", 201, json={"type": "TEXT", "title": "Intro", "body": "I am — je suis"})
    student = w["student"]["h"]

    assert "anglais-debutant" not in [x["program"]["slug"] for x in client.get("/api/v1/programs").json()["data"]]
    cms.ok("post", f"/lessons/{ls['id']}/publish")
    cms.ok("post", f"/courses/{c['id']}/publish")
    cms.ok("post", f"/programs/{p['id']}/publish")

    catalogue = {x["program"]["slug"]: x for x in client.get("/api/v1/programs").json()["data"]}
    assert catalogue["anglais-debutant"]["lesson_count"] == 1
    client.post(f"/api/v1/programs/{p['id']}/enroll", headers=student)
    lesson = client.get(f"/api/v1/lessons/{ls['id']}", headers=student).json()["data"]
    assert lesson["contents"][0]["body"] == "I am — je suis"
    assert "correct_answer" not in str(lesson["activities"])  # les solutions ne sortent jamais
    act_id = lesson["activities"][0]["activity"]["id"]
    res = client.post(f"/api/v1/activities/{act_id}/submit", headers=student, json={"answer": 0}).json()["data"]
    assert res["is_correct"] is True and res["lesson_completed"] is True and res["explanation"] == "I -> am"


def test_unpublishing_hides_content_from_learners_but_keeps_their_history(client, db, w, cms):
    p, c, ls = build_publishable(cms)
    for kind, id_ in (("lessons", ls["id"]), ("courses", c["id"]), ("programs", p["id"])):
        cms.ok("post", f"/{kind}/{id_}/publish")
    student = w["student"]["h"]
    client.post(f"/api/v1/programs/{p['id']}/enroll", headers=student)
    act = client.get(f"/api/v1/lessons/{ls['id']}", headers=student).json()["data"]["activities"][0]["activity"]["id"]
    client.post(f"/api/v1/activities/{act}/submit", headers=student, json={"answer": 0})

    assert cms.ok("get", f"/programs/{p['id']}")["enrolled_students"] == 1
    cms.ok("post", f"/lessons/{ls['id']}/unpublish")
    gone = client.get(f"/api/v1/lessons/{ls['id']}", headers=student)
    assert gone.status_code == 404
    assert db.scalar(select(func.count()).select_from(ActivityAttempt)) == 1  # historique intact
    cms.ok("post", f"/lessons/{ls['id']}/publish")
    assert client.get(f"/api/v1/lessons/{ls['id']}", headers=student).status_code == 200  # et de retour


# ---------- règles de publication ----------


def test_publication_rules_explain_what_is_missing(cms, db):
    p = cms.program()
    c = cms.course(p["id"])
    ls = cms.lesson(c["id"])
    for path, needle in ((f"/lessons/{ls['id']}/publish", "exercice"), (f"/courses/{c['id']}/publish", "leçon"),
                         (f"/programs/{p['id']}/publish", "cours")):
        r = cms.req("post", path)
        err = r.json()["error"]
        assert r.status_code == 422 and err["code"] == "CANNOT_PUBLISH"
        assert needle in err["details"][0]["message"] and err["details"][0]["field"] == "publish"


def test_a_lesson_with_a_broken_stored_exercise_cannot_be_published(cms, db):
    _, _, ls = build_publishable(cms)
    broken = Activity(lesson_id=ls["id"], type=ActivityType.MCQ, title="Cassé", position=9,
                      configuration={"question": "?", "options": ["a"], "correct_answer": 5}, difficulty=Difficulty.BEGINNER)
    db.add(broken)
    db.flush()
    r = cms.req("post", f"/lessons/{ls['id']}/publish")
    assert r.status_code == 422 and "Cassé" in r.json()["error"]["details"][0]["message"]


# ---------- exercices ----------


def test_invalid_activity_is_rejected_with_field_details(cms):
    _, _, ls = build_publishable(cms)
    r = cms.req("post", f"/lessons/{ls['id']}/activities", json={
        "type": "MCQ", "title": "x", "configuration": {"question": "q", "options": ["a", "b"], "correct_answer": 7}})
    err = r.json()["error"]
    assert r.status_code == 422 and err["code"] == "ACTIVITY_INVALID"
    assert err["details"][0]["field"] == "configuration" and "Bonne réponse" in err["details"][0]["message"]
    assert cms.req("post", f"/lessons/{ls['id']}/activities", json={
        "type": "NOPE", "title": "x", "configuration": {}}).status_code == 422
    assert cms.req("post", f"/lessons/{ls['id']}/activities", json={
        "type": "MCQ", "title": "x", "points": 99, "configuration": MCQ}).status_code == 422


def test_ordering_activity_gets_a_derived_shuffled_pool(cms):
    _, _, ls = build_publishable(cms)
    a = cms.activity(ls["id"], {"correct_order": ["I", "am", "a", "student"]}, "Ordre", "ORDERING")
    assert sorted(a["configuration"]["items"]) == sorted(a["configuration"]["correct_order"])
    assert a["configuration"]["items"] != a["configuration"]["correct_order"]


def test_update_activity_validates_and_type_is_frozen_once_attempted(client, db, w, cms):
    _, _, ls = build_publishable(cms)
    act = cms.ok("get", f"/lessons/{ls['id']}")["activities"][0]
    bad = cms.req("patch", f"/activities/{act['id']}", json={"configuration": {"question": "q"}})
    assert bad.status_code == 422
    upd = cms.ok("patch", f"/activities/{act['id']}", json={"title": "Renommé", "points": 3})
    assert upd["title"] == "Renommé" and upd["points"] == 3 and upd["configuration"]["correct_answer"] == 0
    # changement de type possible tant que personne n'a tenté l'exercice
    cms.ok("patch", f"/activities/{act['id']}", json={"type": "TRUE_FALSE", "configuration": {"question": "x", "correct_answer": True}})
    cms.ok("patch", f"/activities/{act['id']}", json={"type": "MCQ", "configuration": MCQ})
    db.add(ActivityAttempt(student_id=w["student"]["id"], activity_id=act["id"], is_correct=True))
    db.flush()
    r = cms.req("patch", f"/activities/{act['id']}", json={"type": "TRUE_FALSE", "configuration": {"question": "x", "correct_answer": True}})
    assert r.status_code == 409 and r.json()["error"]["code"] == "ACTIVITY_HAS_ATTEMPTS"
    assert cms.ok("get", f"/lessons/{ls['id']}")["activities"][0]["attempts"] == 1


def test_archiving_activities(client, db, w, cms):
    _, _, ls = build_publishable(cms)
    second = cms.activity(ls["id"], title="Q2")
    cms.ok("post", f"/lessons/{ls['id']}/publish")
    cms.ok("delete", f"/activities/{second['id']}", 204)  # il en reste un
    only = cms.ok("get", f"/lessons/{ls['id']}")["activities"][0]
    r = cms.req("delete", f"/activities/{only['id']}")
    assert r.status_code == 409 and r.json()["error"]["code"] == "LAST_ACTIVITY"
    cms.ok("post", f"/lessons/{ls['id']}/unpublish")
    db.add(ActivityAttempt(student_id=w["student"]["id"], activity_id=only["id"], is_correct=True))
    db.flush()
    cms.ok("delete", f"/activities/{only['id']}", 204)  # archivé, mais la tentative de l'élève reste
    assert db.scalar(select(func.count()).select_from(ActivityAttempt)) == 1
    assert cms.ok("get", f"/lessons/{ls['id']}")["activities"] == []


# ---------- archivage ----------


def test_archived_program_disappears_for_everyone_but_students_keep_their_data(client, db, w, cms):
    p, c, ls = build_publishable(cms)
    for kind, id_ in (("lessons", ls["id"]), ("courses", c["id"]), ("programs", p["id"])):
        cms.ok("post", f"/{kind}/{id_}/publish")
    student = w["student"]["h"]
    client.post(f"/api/v1/programs/{p['id']}/enroll", headers=student)
    cms.ok("delete", f"/programs/{p['id']}", 204)
    assert "anglais-debutant" not in [x["program"]["slug"] for x in client.get("/api/v1/programs").json()["data"]]
    assert client.get(f"/api/v1/lessons/{ls['id']}", headers=student).status_code == 404
    assert cms.req("get", f"/programs/{p['id']}").status_code == 404
    assert [x["program"]["slug"] for x in cms.ok("get", "/programs")] == []
    assert db.scalar(select(func.count()).select_from(Enrollment)) == 1  # l'inscription (historique) subsiste


# ---------- ordre ----------


def test_reordering_lessons_changes_what_learners_see(client, db, w, cms):
    p = cms.program()
    c = cms.course(p["id"])
    a, b, d = (cms.lesson(c["id"], t) for t in ("A", "B", "C"))
    for ls in (a, b, d):
        cms.activity(ls["id"])
        cms.ok("post", f"/lessons/{ls['id']}/publish")
    cms.ok("post", f"/courses/{c['id']}/publish")
    cms.ok("post", f"/programs/{p['id']}/publish")
    cms.ok("post", f"/courses/{c['id']}/lessons/reorder", 204, json={"ids": [d["id"], a["id"], b["id"]]})
    titles = [x["lesson"]["title"] for x in client.get(f"/api/v1/programs/{p['slug']}").json()["data"]["courses"][0]["lessons"]]
    assert titles == ["C", "A", "B"]
    for bad in ([a["id"], b["id"]], [a["id"], a["id"], b["id"]], [a["id"], b["id"], "00000000-0000-0000-0000-000000000000"]):
        r = cms.req("post", f"/courses/{c['id']}/lessons/reorder", json={"ids": bad})
        assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_ORDER"
    new = cms.lesson(c["id"], "D")  # un nouvel élément se place à la fin
    assert new["position"] == 4


# ---------- contenus ----------


def test_content_rules_and_dangerous_links(cms):
    _, _, ls = build_publishable(cms)
    path = f"/lessons/{ls['id']}/contents"
    assert cms.req("post", path, json={"type": "TEXT", "body": "  "}).status_code == 422
    assert cms.req("post", path, json={"type": "AUDIO"}).status_code == 422
    msg = cms.req("post", path, json={"type": "EXTERNAL_LINK", "url": "javascript:x"}).json()["error"]["details"][0]["message"]
    assert msg.startswith("L'adresse doit commencer") and "Value error" not in msg  # message lisible, pas technique
    for evil in ("javascript:alert(1)", "data:text/html,<script>", "ftp://x.org/a", "//evil.com"):
        assert cms.req("post", path, json={"type": "EXTERNAL_LINK", "url": evil}).status_code == 422
    link = cms.ok("post", path, 201, json={"type": "EXTERNAL_LINK", "title": "Doc", "url": "https://example.com/doc"})
    audio = cms.ok("post", path, 201, json={"type": "AUDIO", "url": "https://cdn.example.com/a.mp3"})
    assert [link["position"], audio["position"]] == [1, 2]
    patched = cms.req("patch", f"/contents/{link['content']['id']}", json={"url": "javascript:x"})
    assert patched.status_code == 422
    cms.ok("post", f"{path}/reorder", 204, json={"ids": [audio["content"]["id"], link["content"]["id"]]})
    assert [c["content"]["type"] for c in cms.ok("get", f"/lessons/{ls['id']}")["contents"]] == ["AUDIO", "EXTERNAL_LINK"]
    cms.ok("delete", f"/contents/{audio['content']['id']}", 204)
    assert len(cms.ok("get", f"/lessons/{ls['id']}")["contents"]) == 1
    assert cms.req("delete", f"/contents/{audio['content']['id']}").status_code == 404


def test_text_content_cannot_be_blanked(cms):
    _, _, ls = build_publishable(cms)
    t = cms.ok("post", f"/lessons/{ls['id']}/contents", 201, json={"type": "TEXT", "body": "Bonjour"})
    assert cms.req("patch", f"/contents/{t['content']['id']}", json={"body": ""}).status_code == 422


# ---------- situations d'oral ----------


def test_scenario_lifecycle_and_learner_visibility(client, db, w, cms):
    seed_speaking(db)
    base = len(client.get("/api/v1/speaking/scenarios").json()["data"])
    sc = cms.ok("post", "/scenarios", 201, json={
        "title": "Au restaurant", "difficulty": "ELEMENTARY", "estimated_minutes": 4,
        "context": "You are at a restaurant. Order a meal and ask for the bill."})
    assert sc["slug"] == "au-restaurant" and sc["is_published"] is False
    assert db.scalar(select(func.count()).select_from(SpeakingScenarioSkill).where(
        SpeakingScenarioSkill.scenario_id == sc["id"])) == 4
    assert len(client.get("/api/v1/speaking/scenarios").json()["data"]) == base  # brouillon : invisible
    cms.ok("post", f"/scenarios/{sc['id']}/publish")
    assert len(client.get("/api/v1/speaking/scenarios").json()["data"]) == base + 1
    edited = cms.ok("patch", f"/scenarios/{sc['id']}", json={"title": "Au restaurant (2)"})
    assert edited["title"] == "Au restaurant (2)"
    cms.ok("post", f"/scenarios/{sc['id']}/unpublish")
    assert len(client.get("/api/v1/speaking/scenarios").json()["data"]) == base
    short = cms.req("post", "/scenarios", json={"title": "x", "difficulty": "BEGINNER", "context": "court"})
    assert short.status_code == 422
    assert cms.req("delete", f"/scenarios/{sc['id']}").status_code == 405  # jamais supprimé (sessions liées)


# ---------- audit ----------


def test_every_authoring_action_is_audited_with_the_actor(db, w, cms):
    p, _, ls = build_publishable(cms)
    cms.ok("post", f"/lessons/{ls['id']}/publish")
    cms.ok("patch", f"/programs/{p['id']}", json={"name": "Nouveau nom"})
    cms.ok("delete", f"/lessons/{ls['id']}", 204)
    actions = [a.action for a in db.scalars(select(AuditLog).order_by(AuditLog.created_at))]
    for expected in ("PROGRAM_CREATED", "COURSE_CREATED", "LESSON_CREATED", "ACTIVITY_CREATED", "LESSON_PUBLISHED",
                     "PROGRAM_UPDATED", "LESSON_ARCHIVED"):
        assert expected in actions
    assert {str(a.user_id) for a in db.scalars(select(AuditLog))} == {w["teacher"]["id"]}


def test_demo_content_remains_editable_through_the_cms(client, db, w, cms):
    seed_demo_content(db)
    programs = {x["program"]["slug"]: x for x in cms.ok("get", "/programs")}
    assert programs["english-speaking"]["lesson_count"] == 3
    detail = cms.ok("get", f"/programs/{programs['english-speaking']['program']['id']}")
    assert detail["program"]["status"] == "PUBLISHED" and len(detail["courses"][0]["lessons"]) == 3
    lesson_id = detail["courses"][0]["lessons"][0]["id"]
    lesson = cms.ok("get", f"/lessons/{lesson_id}")
    assert len(lesson["activities"]) == 6 and "correct_answer" in str(lesson["activities"])  # l'éditeur voit les solutions
