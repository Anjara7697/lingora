import uuid

from fastapi import APIRouter

from app.modules.learning import schemas as s
from app.modules.learning import service
from app.shared.dependencies import CurrentUser, DbSession, OptionalUser
from app.shared.errors import envelope

router = APIRouter(tags=["learning"])


def _out(model: type, data) -> dict:
    return envelope(model.model_validate(data).model_dump(mode="json"))


@router.get("/programs")
def list_programs(db: DbSession):
    items = [s.ProgramListItem.model_validate(i).model_dump(mode="json") for i in service.list_programs(db)]
    return envelope(items)


@router.get("/programs/{slug}")
def program_detail(slug: str, db: DbSession, user: OptionalUser):
    return _out(s.ProgramDetail, service.get_program_detail(db, slug, user))


@router.post("/programs/{program_id}/enroll", status_code=201)
def enroll(program_id: uuid.UUID, db: DbSession, user: CurrentUser):
    return _out(s.EnrollmentOut, service.enroll(db, user, program_id))


@router.get("/me/enrollments")
def my_enrollments(db: DbSession, user: CurrentUser):
    rows = [
        s.EnrollmentItem(enrollment=e, program=p).model_dump(mode="json")
        for e, p in service.my_enrollments(db, user)
    ]
    return envelope(rows)


@router.get("/me/next")
def next_step(db: DbSession, user: CurrentUser):
    step = service.next_step(db, user)
    return envelope(s.NextStep.model_validate(step).model_dump(mode="json") if step else None)


@router.get("/lessons/{lesson_id}")
def lesson_detail(lesson_id: uuid.UUID, db: DbSession, user: CurrentUser):
    return _out(s.LessonDetail, service.get_lesson_detail(db, user, lesson_id))


@router.post("/activities/{activity_id}/submit")
def submit_activity(activity_id: uuid.UUID, body: s.SubmitRequest, db: DbSession, user: CurrentUser):
    result = service.submit_activity(db, user, activity_id, body.answer, body.duration_seconds)
    return _out(s.SubmitResult, result)
