from fastapi import APIRouter

from app.modules.auth.schemas import ChangePasswordRequest
from app.modules.users import onboarding, service
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


@router.get("/onboarding")
def get_onboarding(user: CurrentUser, db: DbSession):
    data = onboarding.get_onboarding(db, user)
    return envelope(data.model_dump(mode="json") if data else None)


@router.put("/onboarding")
def save_onboarding(body: onboarding.OnboardingIn, user: CurrentUser, db: DbSession):
    return envelope(onboarding.save_onboarding(db, user, body).model_dump(mode="json"))
