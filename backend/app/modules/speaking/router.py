import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Response, UploadFile

from app.core.config import settings
from app.core.security import decode_token
from app.modules.speaking import schemas as s
from app.modules.speaking import service
from app.shared.dependencies import CurrentUser, DbSession
from app.shared.errors import AppError, envelope

router = APIRouter(prefix="/speaking", tags=["speaking"])


@router.get("/scenarios")
def scenarios(db: DbSession):
    items = [s.ScenarioOut.model_validate(x).model_dump(mode="json") for x in service.list_scenarios(db)]
    return envelope(items)


@router.post("/sessions", status_code=201)
def create_session(body: s.CreateSession, db: DbSession, user: CurrentUser):
    session = service.create_session(db, user, body.scenario_id)
    return envelope(s.SessionOut.model_validate(session).model_dump(mode="json"))


@router.get("/sessions/{session_id}")
def session_detail(session_id: uuid.UUID, db: DbSession, user: CurrentUser):
    data = service.get_session_detail(db, user, session_id)
    return envelope(s.SessionDetail.model_validate(data).model_dump(mode="json"))


@router.post("/sessions/{session_id}/turns", status_code=201)
def submit_turn(
    session_id: uuid.UUID,
    db: DbSession,
    user: CurrentUser,
    audio: Annotated[UploadFile, File()],
    duration_seconds: Annotated[float, Form()],
    transcript: Annotated[str | None, Form(max_length=4000)] = None,
):
    data = audio.file.read(settings.max_audio_bytes + 1)  # lecture bornée : pas de gros fichier en mémoire
    turn = service.submit_turn(db, user, session_id, data, audio.content_type or "", duration_seconds, transcript)
    return envelope(s.TurnOut.model_validate(turn).model_dump(mode="json"))


@router.post("/sessions/{session_id}/complete")
def complete_session(session_id: uuid.UUID, db: DbSession, user: CurrentUser):
    data = service.complete_session(db, user, session_id)
    return envelope(s.SessionDetail.model_validate(data).model_dump(mode="json"))


@router.get("/media/{media_id}")
def media(media_id: uuid.UUID, token: str, db: DbSession):
    """Le jeton signé (5 min) remplace l'en-tête Authorization, qu'une balise <audio> ne peut pas envoyer."""
    if decode_token(token, "media") != str(media_id):
        raise AppError(401, "INVALID_MEDIA_TOKEN", "Lien expiré ou invalide")
    content, mime = service.load_media(db, media_id)
    return Response(content=content, media_type=mime, headers={"Cache-Control": "private, no-store"})
