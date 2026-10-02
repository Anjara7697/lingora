from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    DUMMY_HASH,
    create_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import RegisterRequest, TokenPair
from app.modules.identity.models import User, UserProfile, UserRole, UserStatus
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
    user_id = decode_token(refresh_token, "refresh")
    user = db.get(User, user_id) if user_id else None
    if user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE:
        raise AppError(401, "INVALID_TOKEN", "Jeton invalide ou expiré")
    return issue_tokens(user)
