from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.modules.identity.models import (
    Permission,
    Role,
    User,
    UserRole,
    UserStatus,
    role_permissions,
)
from app.shared.errors import AppError

DbSession = Annotated[Session, Depends(get_db)]
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise AppError(401, "NOT_AUTHENTICATED", "Authentification requise")
    user_id = decode_token(credentials.credentials, "access")
    user = db.get(User, user_id) if user_id else None
    if user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE:
        raise AppError(401, "INVALID_TOKEN", "Jeton invalide ou expiré")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    """Dépendance de route : n'autorise que les rôles listés (ADMIN inclus seulement si listé)."""

    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise AppError(403, "FORBIDDEN", "Accès refusé pour ce rôle")
        return user

    return checker


def get_optional_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User | None:
    """Utilisateur connecté s'il y en a un ; None pour un visiteur (jeton absent ou invalide)."""
    if credentials is None:
        return None
    user_id = decode_token(credentials.credentials, "access")
    user = db.get(User, user_id) if user_id else None
    if user is None or user.deleted_at is not None or user.status != UserStatus.ACTIVE:
        return None
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def has_permission(db: Session, user: User, code: str) -> bool:
    return bool(
        db.scalar(
            select(func.count())
            .select_from(Permission)
            .join(role_permissions, role_permissions.c.permission_id == Permission.id)
            .join(Role, Role.id == role_permissions.c.role_id)
            .where(Role.code == user.role.value, Permission.code == code)
        )
    )


def require_permission(code: str):
    """Autorisation fine (architecture §27) : les permissions du rôle sont lues en base."""

    def checker(user: CurrentUser, db: DbSession) -> User:
        if not has_permission(db, user, code):
            raise AppError(403, "FORBIDDEN", "Accès refusé : permission manquante")
        return user

    return checker
