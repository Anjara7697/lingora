import uuid

from fastapi import APIRouter

from app.modules.assessment import schemas as s
from app.modules.assessment import service
from app.shared.dependencies import CurrentUser, DbSession
from app.shared.errors import envelope

router = APIRouter(prefix="/placement", tags=["placement"])


@router.post("/start")
def start(db: DbSession, user: CurrentUser):
    return envelope(s.StartOut.model_validate(service.start(db, user)).model_dump(mode="json"))


@router.put("/{attempt_id}/answers/{question_id}", status_code=204)
def save_answer(attempt_id: uuid.UUID, question_id: uuid.UUID, body: s.AnswerIn, db: DbSession, user: CurrentUser):
    service.save_answer(db, user, attempt_id, question_id, body.answer)


@router.post("/{attempt_id}/complete")
def complete(attempt_id: uuid.UUID, db: DbSession, user: CurrentUser):
    return envelope(s.PlacementResult.model_validate(service.complete(db, user, attempt_id)).model_dump(mode="json"))


@router.get("/result")
def latest_result(db: DbSession, user: CurrentUser):
    data = service.latest_result(db, user)
    return envelope(s.PlacementResult.model_validate(data).model_dump(mode="json") if data else None)


@router.get("/{attempt_id}/result")
def result(attempt_id: uuid.UUID, db: DbSession, user: CurrentUser):
    return envelope(s.PlacementResult.model_validate(service.result_by_id(db, user, attempt_id)).model_dump(mode="json"))
