from fastapi import APIRouter, BackgroundTasks, Request

from app.core.rate_limit import check_rate_limit
from app.integrations.email import send_email_safely
from app.modules.auth import service
from app.modules.auth.schemas import (
    AuthOut,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.modules.users.schemas import UserOut
from app.shared.dependencies import DbSession
from app.shared.errors import envelope

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user) -> dict:
    out = AuthOut(user=UserOut.from_user(user), tokens=service.issue_tokens(user))
    return envelope(out.model_dump(mode="json"))


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: DbSession, request: Request):
    check_rate_limit(request, "register", limit=10, window=600)
    return _auth_response(service.register(db, body))


@router.post("/login")
def login(body: LoginRequest, db: DbSession, request: Request):
    check_rate_limit(request, "login", limit=8, window=60, extra=body.email)  # essais répétés sur un même compte
    check_rate_limit(request, "login-ip", limit=40, window=60)  # balayage de comptes depuis une même adresse
    return _auth_response(service.authenticate(db, body.email, body.password))


@router.post("/refresh")
def refresh(body: RefreshRequest, db: DbSession):
    return envelope(service.refresh(db, body.refresh_token).model_dump())


@router.post("/logout", status_code=204)
def logout():
    """Les jetons sont sans état : le client les supprime. (Révocation serveur : avec Redis, plus tard.)"""


FORGOT_RESPONSE = {"message": "Si un compte existe pour cette adresse, un email vient d'être envoyé."}


@router.post("/forgot-password", status_code=202)
def forgot_password(body: ForgotPasswordRequest, db: DbSession, request: Request, background: BackgroundTasks):
    """Réponse identique que le compte existe ou non : on ne révèle jamais quelles adresses sont inscrites."""
    check_rate_limit(request, "forgot", limit=3, window=3600, extra=body.email)
    check_rate_limit(request, "forgot-ip", limit=10, window=3600)
    created = service.create_reset_token(db, body.email)
    if created:
        user, token = created
        subject, text = service.reset_email(user, token)
        background.add_task(send_email_safely, user.email, subject, text)  # après la réponse : pas d'écart de délai
    return envelope(FORGOT_RESPONSE)


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: DbSession, request: Request):
    check_rate_limit(request, "reset-ip", limit=10, window=900)
    service.reset_password(db, body.token, body.password)
    return envelope({"message": "Mot de passe modifié. Vous pouvez vous connecter."})
