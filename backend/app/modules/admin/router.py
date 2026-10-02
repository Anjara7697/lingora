import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.modules.admin import analytics, service
from app.modules.admin import schemas as s
from app.modules.identity.models import UserRole, UserStatus
from app.shared.dependencies import CurrentUser, DbSession, require_permission
from app.shared.errors import envelope

# Gestion des utilisateurs et statistiques globales : permission « users.manage » (ADMIN uniquement).
ManageUsers = Depends(require_permission("users.manage"))
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[ManageUsers])


def _out(model, data):
    return envelope(model.model_validate(data).model_dump(mode="json"))


@router.get("/users")
def users(
    db: DbSession,
    search: str | None = None,
    role: UserRole | None = None,
    status: UserStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return _out(s.UserPage, service.list_users(db, search, role, status, limit, offset))


@router.post("/users", status_code=201)
def create_user(body: s.CreateUser, db: DbSession, actor: CurrentUser):
    return _out(s.AdminUser, service.create_user(db, actor, body))


@router.patch("/users/{user_id}")
def update_user(user_id: uuid.UUID, body: s.UpdateUser, db: DbSession, actor: CurrentUser):
    return _out(s.AdminUser, service.update_user(db, actor, user_id, body))


@router.post("/users/{user_id}/password", status_code=204)
def reset_password(user_id: uuid.UUID, body: s.ResetPassword, db: DbSession, actor: CurrentUser):
    service.reset_password(db, actor, user_id, body.password)


@router.get("/teachers")
def teachers(db: DbSession):
    return envelope([s.TeacherItem.model_validate(t).model_dump(mode="json") for t in service.list_teachers(db)])


@router.get("/teachers/{teacher_id}/roster")
def roster(teacher_id: uuid.UUID, db: DbSession, search: str | None = None):
    return _out(s.Roster, service.roster(db, teacher_id, search))


@router.post("/teachers/{teacher_id}/students")
def assign(teacher_id: uuid.UUID, body: s.AssignStudents, db: DbSession, actor: CurrentUser):
    return envelope({"added": service.assign_students(db, actor, teacher_id, body.student_ids)})


@router.delete("/teachers/{teacher_id}/students/{student_id}", status_code=204)
def unassign(teacher_id: uuid.UUID, student_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    service.unassign_student(db, actor, teacher_id, student_id)


class _Series(BaseModel):
    date: str
    new_students: int
    exercises: int
    speaking_attempts: int


class _Funnel(BaseModel):
    key: str
    label: str
    count: int


class AnalyticsOut(BaseModel):
    generated_at: datetime
    users: dict[str, int]
    activity: dict[str, int]
    north_star: dict[str, int]
    funnel: list[_Funnel]
    learning: dict[str, int]
    speaking: dict[str, float | int | None]
    series: list[_Series]
    definitions: dict[str, str]


@router.get("/analytics")
def analytics_view(db: DbSession):
    return _out(AnalyticsOut, analytics.compute(db))
