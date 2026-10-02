from fastapi import APIRouter

from app.modules.auth.schemas import ChangePasswordRequest
from app.modules.users import service
from app.modules.users.schemas import UserOut, UserUpdate
from app.shared.dependencies import CurrentUser, DbSession
from app.shared.errors import envelope

router = APIRouter(prefix="/me", tags=["me"])


@router.get("")
def get_me(user: CurrentUser):
    return envelope(UserOut.from_user(user).model_dump(mode="json"))


@router.patch("")
def update_me(body: UserUpdate, user: CurrentUser, db: DbSession):
    return envelope(UserOut.from_user(service.update_me(db, user, body)).model_dump(mode="json"))


@router.post("/password", status_code=204)
def change_password(body: ChangePasswordRequest, user: CurrentUser, db: DbSession):
    service.change_password(db, user, body.current_password, body.new_password)
