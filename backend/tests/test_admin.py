from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.modules.admin import schemas as s
from app.modules.admin import service
from app.modules.identity.models import User, UserRole
from app.modules.learning.models import Activity, ActivityAttempt, Skill
from app.modules.platform.models import AuditLog
from app.modules.progress.models import SkillProgressHistory, SkillSourceType
from app.modules.teacher.models import TeacherStudent
from app.seed import seed_demo_content
from app.shared.dependencies import has_permission
from app.shared.errors import AppError


def make_user(client, db, email, role=UserRole.STUDENT, first="Prenom"):
    r = client.post("/api/v1/auth/register", json={
        "first_name": first, "last_name": email.split("@")[0], "email": email,
        "password": "motdepasse1", "password_confirmation": "motdepasse1"})
    data = r.json()["data"]
    db.get(User, data["user"]["id"]).role = role
    db.flush()
    return {"id": data["user"]["id"], "h": {"Authorization": f"Bearer {data['tokens']['access_token']}"}}


@pytest.fixture
def world(client, db):
    return {
        "admin": make_user(client, db, "admin@example.com", UserRole.ADMIN),
        "admin2": make_user(client, db, "admin2@example.com", UserRole.ADMIN),
        "teacher": make_user(client, db, "teach@example.com", UserRole.TEACHER),
        "s1": make_user(client, db, "s1@example.com"),
        "s2": make_user(client, db, "s2@example.com"),
    }


def audit_actions(db):
    return [a.action for a in db.scalars(select(AuditLog).order_by(AuditLog.created_at))]


# ---------- permissions ----------


@pytest.mark.parametrize(("method", "path"), [
    ("get", "/admin/users"), ("get", "/admin/teachers"), ("get", "/admin/analytics"),
    ("get", "/admin/billing/summary"), ("get", "/admin/payments"),
    ("post", "/admin/users"), ("get", "/admin/teachers/00000000-0000-0000-0000-000000000000/roster"),
])
def test_admin_api_is_admin_only(client, world, method, path):
    call = getattr(client, method)
    assert call(f"/api/v1{path}").status_code == 401
    assert call(f"/api/v1{path}", headers=world["s1"]["h"]).status_code == 403
    assert call(f"/api/v1{path}", headers=world["teacher"]["h"]).status_code == 403
    assert call(f"/api/v1{path}", headers=world["admin"]["h"]).status_code != 403


def test_permissions_come_from_the_database(db, world):
    teacher, admin, student = (db.get(User, world[k]["id"]) for k in ("teacher", "admin", "s1"))
    assert has_permission(db, teacher, "courses.update") and not has_permission(db, teacher, "users.manage")
    assert has_permission(db, admin, "users.manage") and has_permission(db, admin, "payments.read")
    assert not has_permission(db, student, "courses.update") and has_permission(db, student, "courses.read")


# ---------- utilisateurs ----------


def test_list_filter_search_and_paginate(client, world):
    h = world["admin"]["h"]
    allu = client.get("/api/v1/admin/users", headers=h).json()["data"]
    assert allu["total"] == 5
    assert all("password" not in str(u) for u in allu["items"])
    teachers = client.get("/api/v1/admin/users?role=TEACHER", headers=h).json()["data"]
    assert [u["email"] for u in teachers["items"]] == ["teach@example.com"]
    found = client.get("/api/v1/admin/users?search=S2@", headers=h).json()["data"]
    assert [u["email"] for u in found["items"]] == ["s2@example.com"]
    page = client.get("/api/v1/admin/users?limit=2&offset=4", headers=h).json()["data"]
    assert page["total"] == 5 and len(page["items"]) == 1
    assert client.get("/api/v1/admin/users?limit=1000", headers=h).status_code == 422


def test_admin_creates_a_teacher_who_can_log_in_and_is_audited(client, db, world):
    r = client.post("/api/v1/admin/users", headers=world["admin"]["h"], json={
        "email": "NEW.prof@example.com", "first_name": "Nouveau", "last_name": "Prof",
        "role": "TEACHER", "password": "Secret-123"})
    assert r.status_code == 201 and r.json()["data"]["role"] == "TEACHER"
    login = client.post("/api/v1/auth/login", json={"email": "new.prof@example.com", "password": "Secret-123"})
    assert login.status_code == 200
    assert "USER_CREATED" in audit_actions(db)
    dup = client.post("/api/v1/admin/users", headers=world["admin"]["h"], json={
        "email": "new.prof@example.com", "first_name": "A", "last_name": "B", "role": "STUDENT",
        "password": "Secret-123"})
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "EMAIL_ALREADY_USED"
    weak = client.post("/api/v1/admin/users", headers=world["admin"]["h"], json={
        "email": "w@example.com", "first_name": "A", "last_name": "B", "role": "STUDENT", "password": "short"})
    assert weak.status_code == 422


def test_role_change_is_audited_with_old_and_new_values(client, db, world):
    r = client.patch(f"/api/v1/admin/users/{world['s1']['id']}", headers=world["admin"]["h"],
                     json={"role": "TEACHER"})
    assert r.status_code == 200 and r.json()["data"]["role"] == "TEACHER"
    log = db.scalar(select(AuditLog).where(AuditLog.action == "ROLE_CHANGED"))
    assert log.old_values == {"role": "STUDENT"} and log.new_values == {"role": "TEACHER"}
    assert str(log.user_id) == world["admin"]["id"] and str(log.entity_id) == world["s1"]["id"]


def test_suspension_takes_effect_immediately_and_is_reversible(client, world):
    h, victim = world["admin"]["h"], world["s1"]
    assert client.get("/api/v1/me", headers=victim["h"]).status_code == 200
    assert client.patch(f"/api/v1/admin/users/{victim['id']}", headers=h, json={"status": "SUSPENDED"}).status_code == 200
    assert client.get("/api/v1/me", headers=victim["h"]).status_code == 401  # jeton existant refusé tout de suite
    login = client.post("/api/v1/auth/login", json={"email": "s1@example.com", "password": "motdepasse1"})
    assert login.status_code == 403 and login.json()["error"]["code"] == "ACCOUNT_DISABLED"
    client.patch(f"/api/v1/admin/users/{victim['id']}", headers=h, json={"status": "ACTIVE"})
    assert client.get("/api/v1/me", headers=victim["h"]).status_code == 200


def test_guard_rails(client, db, world):
    h = world["admin"]["h"]
    me = world["admin"]["id"]
    for body in ({"role": "STUDENT"}, {"status": "SUSPENDED"}):
        r = client.patch(f"/api/v1/admin/users/{me}", headers=h, json=body)
        assert r.status_code == 409 and r.json()["error"]["code"] == "CANNOT_MODIFY_SELF"
    assert client.patch(f"/api/v1/admin/users/{world['s1']['id']}", headers=h,
                        json={"status": "DELETED"}).status_code == 422
    assert client.patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000000", headers=h,
                        json={"role": "TEACHER"}).status_code == 404
    # le dernier administrateur actif ne peut pas être retiré (même par un acteur sans verrou « soi-même »)
    only_admin = db.get(User, world["admin"]["id"])
    db.get(User, world["admin2"]["id"]).role = UserRole.STUDENT
    db.flush()
    with pytest.raises(AppError) as exc:
        service.update_user(db, db.get(User, world["teacher"]["id"]), only_admin.id, s.UpdateUser(role=UserRole.STUDENT))
    assert exc.value.code == "LAST_ADMIN"


def test_demoting_a_teacher_removes_their_roster(client, db, world):
    db.add(TeacherStudent(teacher_id=world["teacher"]["id"], student_id=world["s1"]["id"]))
    db.flush()
    client.patch(f"/api/v1/admin/users/{world['teacher']['id']}", headers=world["admin"]["h"], json={"role": "STUDENT"})
    assert db.scalar(select(func.count()).select_from(TeacherStudent)) == 0


def test_admin_password_reset(client, db, world):
    h = world["admin"]["h"]
    r = client.post(f"/api/v1/admin/users/{world['s1']['id']}/password", headers=h, json={"password": "Nouveau-123"})
    assert r.status_code == 204
    assert client.post("/api/v1/auth/login", json={"email": "s1@example.com", "password": "motdepasse1"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "s1@example.com", "password": "Nouveau-123"}).status_code == 200
    assert "PASSWORD_RESET_BY_ADMIN" in audit_actions(db)
    assert "Nouveau-123" not in str([a.new_values for a in db.scalars(select(AuditLog))])  # jamais dans l'audit


# ---------- assignations ----------


def test_assign_students_to_a_teacher_end_to_end(client, db, world):
    h, tid = world["admin"]["h"], world["teacher"]["id"]
    assert client.get("/api/v1/teacher/students", headers=world["teacher"]["h"]).json()["data"] == []
    r = client.post(f"/api/v1/admin/teachers/{tid}/students", headers=h,
                    json={"student_ids": [world["s1"]["id"], world["s2"]["id"]]})
    assert r.json()["data"] == {"added": 2}
    again = client.post(f"/api/v1/admin/teachers/{tid}/students", headers=h, json={"student_ids": [world["s1"]["id"]]})
    assert again.json()["data"] == {"added": 0}  # idempotent
    mine = client.get("/api/v1/teacher/students", headers=world["teacher"]["h"]).json()["data"]
    assert {x["email"] for x in mine} == {"s1@example.com", "s2@example.com"}  # l'enseignant les voit réellement
    listed = client.get("/api/v1/admin/teachers", headers=h).json()["data"]
    assert [(t["email"], t["student_count"]) for t in listed] == [("teach@example.com", 2)]

    assert client.delete(f"/api/v1/admin/teachers/{tid}/students/{world['s1']['id']}", headers=h).status_code == 204
    assert client.delete(f"/api/v1/admin/teachers/{tid}/students/{world['s1']['id']}", headers=h).status_code == 404
    roster = client.get(f"/api/v1/admin/teachers/{tid}/roster", headers=h).json()["data"]
    assert [x["email"] for x in roster["assigned"]] == ["s2@example.com"]
    assert [x["email"] for x in roster["available"]] == ["s1@example.com"]
    assert {"STUDENTS_ASSIGNED", "STUDENT_UNASSIGNED"} <= set(audit_actions(db))


def test_assignment_validation(client, world):
    h, tid = world["admin"]["h"], world["teacher"]["id"]
    bad = client.post(f"/api/v1/admin/teachers/{tid}/students", headers=h, json={"student_ids": [world["teacher"]["id"]]})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "INVALID_STUDENTS"
    not_teacher = client.post(f"/api/v1/admin/teachers/{world['s1']['id']}/students", headers=h,
                              json={"student_ids": [world["s2"]["id"]]})
    assert not_teacher.status_code == 422 and not_teacher.json()["error"]["code"] == "NOT_A_TEACHER"
    assert client.post(f"/api/v1/admin/teachers/{tid}/students", headers=h, json={"student_ids": []}).status_code == 422


# ---------- statistiques ----------


def test_analytics_on_an_empty_platform(client, world):
    d = client.get("/api/v1/admin/analytics", headers=world["admin"]["h"]).json()["data"]
    assert d["users"]["students"] == 2 and d["users"]["teachers"] == 1
    assert d["activity"] == {"active_7d": 0, "active_30d": 0}
    assert d["north_star"] == {"value": 0, "of_active_30d": 0}
    assert [f["count"] for f in d["funnel"]] == [2, 0, 0, 0, 0]
    assert len(d["series"]) == 14 and d["series"][-1]["new_students"] == 2
    assert d["speaking"]["average_score_30d"] is None and "north_star" in d["definitions"]


def test_analytics_counts_real_activity_and_measurable_progress(client, db, world):
    seed_demo_content(db)
    activity = db.scalar(select(Activity))
    skill = db.scalar(select(Skill).where(Skill.code == "SPEAKING"))
    s1, s2 = world["s1"]["id"], world["s2"]["id"]
    db.add(ActivityAttempt(student_id=s1, activity_id=activity.id, is_correct=True, score=Decimal(1)))
    db.add(ActivityAttempt(student_id=s2, activity_id=activity.id, is_correct=True, score=Decimal(1)))
    for student, scores in ((s1, (40, 70)), (s2, (60, 60))):  # s1 progresse, s2 stagne
        for sc in scores:
            db.add(SkillProgressHistory(student_id=student, skill_id=skill.id, source_type=SkillSourceType.SPEAKING,
                                        score=Decimal(sc)))
            db.flush()
    d = client.get("/api/v1/admin/analytics", headers=world["admin"]["h"]).json()["data"]
    assert d["activity"]["active_7d"] == 2 and d["activity"]["active_30d"] == 2
    assert d["north_star"] == {"value": 1, "of_active_30d": 2}  # seul s1 a progressé
    assert d["learning"]["exercises_7d"] == 2
    assert d["series"][-1]["exercises"] == 2
    assert d["funnel"][0]["count"] == 2


def test_inactive_students_are_not_counted_in_the_north_star(client, db, world):
    skill = db.scalar(select(Skill).where(Skill.code == "SPEAKING"))
    for sc in (30, 90):  # progresse, mais n'a aucune activité récente
        db.add(SkillProgressHistory(student_id=world["s1"]["id"], skill_id=skill.id,
                                    source_type=SkillSourceType.SPEAKING, score=Decimal(sc)))
        db.flush()
    d = client.get("/api/v1/admin/analytics", headers=world["admin"]["h"]).json()["data"]
    assert d["north_star"]["value"] == 0
