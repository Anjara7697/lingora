import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, update

from app.modules.platform.models import Notification, NotificationChannel, NotificationStatus
from app.modules.teacher import service as teacher_service
from app.shared.dependencies import CurrentUser, DbSession
from app.shared.errors import AppError, envelope

router = APIRouter(prefix="/me", tags=["me"])


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    message: str | None
    read_at: datetime | None
    created_at: datetime


def _mine(user):
    return (Notification.user_id == user.id, Notification.channel == NotificationChannel.IN_APP)


@router.get("/notifications")
def notifications(db: DbSession, user: CurrentUser):
    rows = db.scalars(select(Notification).where(*_mine(user)).order_by(Notification.created_at.desc()).limit(50))
    unread = db.scalar(select(func.count()).select_from(Notification).where(*_mine(user), Notification.read_at.is_(None)))
    return envelope([NotificationOut.model_validate(n).model_dump(mode="json") for n in rows], {"unread": unread})


@router.post("/notifications/{notification_id}/read", status_code=204)
def mark_read(notification_id: uuid.UUID, db: DbSession, user: CurrentUser):
    n = db.scalar(select(Notification).where(Notification.id == notification_id, *_mine(user)))
    if not n:
        raise AppError(404, "NOTIFICATION_NOT_FOUND", "Notification introuvable")
    if n.read_at is None:
        n.read_at, n.status = datetime.now(UTC), NotificationStatus.READ
        db.commit()


@router.post("/notifications/read-all", status_code=204)
def mark_all_read(db: DbSession, user: CurrentUser):
    db.execute(update(Notification).where(*_mine(user), Notification.read_at.is_(None))
               .values(read_at=datetime.now(UTC), status=NotificationStatus.READ))
    db.commit()


@router.get("/teacher-feedback")
def my_teacher_feedback(db: DbSession, user: CurrentUser):
    from app.modules.teacher.schemas import FeedbackItem

    items = teacher_service.feedback_for_student(db, user.id)
    return envelope([FeedbackItem.model_validate(i).model_dump(mode="json") for i in items])
