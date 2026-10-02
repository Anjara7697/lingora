from fastapi import APIRouter

from app.modules.auth import service
from app.modules.auth.schemas import AuthOut, LoginRequest, RefreshRequest, RegisterRequest
from app.modules.users.schemas import UserOut
from app.shared.dependencies import DbSession
from app.shared.errors import envelope

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user) -> dict:
    out = AuthOut(user=UserOut.from_user(user), tokens=service.issue_tokens(user))
    return envelope(out.model_dump(mode="json"))


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: DbSession):
    return _auth_response(service.register(db, body))


@router.post("/login")
def login(body: LoginRequest, db: DbSession):
    return _auth_response(service.authenticate(db, body.email, body.password))


@router.post("/refresh")
def refresh(body: RefreshRequest, db: DbSession):
    return envelope(service.refresh(db, body.refresh_token).model_dump())


@router.post("/logout", status_code=204)
def logout():
    """Les jetons sont sans état : le client les supprime. (Révocation serveur : avec Redis, plus tard.)"""
