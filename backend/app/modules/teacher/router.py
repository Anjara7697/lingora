import uuid

from fastapi import APIRouter, Depends

from app.modules.identity.models import UserRole
from app.modules.teacher import schemas as s
from app.modules.teacher import service
from app.modules.teacher.service import StudentStatus
from app.shared.dependencies import DbSession, require_roles
from app.shared.errors import envelope

TeacherOnly = Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN))
router = APIRouter(prefix="/teacher", tags=["teacher"])


def _out(model, data):
    return envelope(model.model_validate(data).model_dump(mode="json"))


@router.get("/dashboard")
def dashboard(db: DbSession, teacher=TeacherOnly):
    return _out(s.DashboardOut, service.dashboard(db, teacher))


@router.get("/students")
def students(db: DbSession, search: str | None = None, status: StudentStatus | None = None, teacher=TeacherOnly):
    rows = service.list_students(db, teacher, search, status)
    return envelope([s.StudentRow.model_validate(r).model_dump(mode="json") for r in rows])


@router.get("/students/{student_id}")
def student_detail(student_id: uuid.UUID, db: DbSession, teacher=TeacherOnly):
    return _out(s.StudentDetail, service.student_detail(db, teacher, student_id))


@router.get("/students/{student_id}/speaking/{session_id}")
def speaking_session(student_id: uuid.UUID, session_id: uuid.UUID, db: DbSession, teacher=TeacherOnly):
    return _out(s.TeacherSessionDetail, service.speaking_session_detail(db, teacher, student_id, session_id))


@router.post("/students/{student_id}/feedback", status_code=201)
def add_feedback(student_id: uuid.UUID, body: s.FeedbackIn, db: DbSession, teacher=TeacherOnly):
    data = service.add_feedback(db, teacher, student_id, body.comment, body.score,
                                body.speaking_session_id, body.lesson_id)
    return _out(s.FeedbackItem, data)
