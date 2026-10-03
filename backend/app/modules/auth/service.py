import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    DUMMY_HASH,
    create_token,
    decode_token_claims,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import RegisterRequest, TokenPair
from app.modules.identity.models import PasswordResetToken, User, UserProfile, UserRole, UserStatus
from app.shared.audit import record_audit
from app.shared.dependencies import token_revoked
from app.shared.errors import AppError


def issue_tokens(user: User) -> TokenPair:
    uid = str(user.id)
    return TokenPair(access_token=create_token(uid, "access"), refresh_token=create_token(uid, "refresh"))


def register(db: Session, data: RegisterRequest) -> User:
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        role=UserRole.STUDENT,  # CDC F02 : rôle STUDENT par défaut, jamais choisi par le client
        status=UserStatus.ACTIVE,
        profile=UserProfile(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "EMAIL_ALREADY_USED", "Cet email est déjà utilisé") from None
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    # Toujours vérifier un hash pour garder un temps de réponse comparable.
    valid = verify_password(password, user.password_hash if user and user.password_hash else DUMMY_HASH)
    if not user or not valid:
        raise AppError(401, "INVALID_CREDENTIALS", "Email ou mot de passe incorrect")
    if user.status != UserStatus.ACTIVE:
        raise AppError(403, "ACCOUNT_DISABLED", "Ce compte n'est pas actif")
    user.last_login_at = datetime.now(UTC)
    db.commit()
    return user


def refresh(db: Session, refresh_token: str) -> TokenPair:
    claims = decode_token_claims(refresh_token, "refresh")
    user = db.get(User, claims[0]) if claims else None
    if (user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE
            or token_revoked(user, claims[1], claims[2])):
        raise AppError(401, "INVALID_TOKEN", "Jeton invalide ou expiré")
    return issue_tokens(user)


# ---------- Récupération du mot de passe ----------

RESET_REQUESTS_PER_HOUR = 3  # par compte : empêche d'inonder une boîte mail


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_reset_token(db: Session, email: str) -> tuple[User, str] | None:
    """Crée un jeton pour un compte actif existant ; None sinon (l'appelant répond pareil dans tous les cas)."""
    user = db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None),
                                        User.status == UserStatus.ACTIVE))
    if not user:
        return None
    now = datetime.now(UTC)
    recent = db.scalar(select(func.count()).select_from(PasswordResetToken).where(
        PasswordResetToken.user_id == user.id, PasswordResetToken.created_at >= now - timedelta(hours=1)))
    if recent >= RESET_REQUESTS_PER_HOUR:
        return None
    # une nouvelle demande invalide les liens précédents
    for old in db.scalars(select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))):
        old.used_at = now
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(user_id=user.id, token_hash=_hash_token(token),
                              expires_at=now + timedelta(minutes=settings.password_reset_minutes)))
    db.commit()
    return user, token


def reset_link(token: str) -> str:
    return f"{settings.app_base_url.rstrip('/')}/reset-password?token={token}"


def reset_email(user: User, token: str) -> tuple[str, str]:
    subject = "Réinitialisation de votre mot de passe Lingora"
    body = (
        f"Bonjour {user.first_name},\n\n"
        "Vous avez demandé à réinitialiser votre mot de passe Lingora. "
        f"Ouvrez ce lien (valable {settings.password_reset_minutes} minutes, utilisable une seule fois) :\n\n"
        f"{reset_link(token)}\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.\n\n"
        "L'équipe Lingora\n"
    )
    return subject, body


def reset_password(db: Session, token: str, new_password: str) -> None:
    now = datetime.now(UTC)
    row = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_token(token)))
    if not row or row.used_at is not None or row.expires_at <= now:
        raise AppError(400, "INVALID_OR_EXPIRED_TOKEN", "Ce lien est invalide ou a expiré. Faites une nouvelle demande.")
    user = db.get(User, row.user_id)
    if not user or user.deleted_at is not None:
        raise AppError(400, "INVALID_OR_EXPIRED_TOKEN", "Ce lien est invalide ou a expiré. Faites une nouvelle demande.")
    user.password_hash = hash_password(new_password)
    user.password_changed_at = now  # invalide toutes les sessions ouvertes (jetons déjà émis)
    for t in db.scalars(select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))):
        t.used_at = now
    record_audit(db, user, "PASSWORD_RESET", "user", user.id)
    db.commit()
