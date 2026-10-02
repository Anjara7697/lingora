from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.modules.identity.models import User, UserProfile
from app.modules.users.schemas import UserUpdate
from app.shared.errors import AppError


def update_me(db: Session, user: User, data: UserUpdate) -> User:
    fields = data.model_dump(exclude_unset=True)
    profile_fields = fields.pop("profile", None)
    for key, value in fields.items():
        setattr(user, key, value)
    if profile_fields:
        if user.profile is None:
            user.profile = UserProfile()
        for key, value in profile_fields.items():
            setattr(user.profile, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "PHONE_ALREADY_USED", "Ce numéro est déjà utilisé") from None
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current: str, new: str) -> None:
    if not user.password_hash or not verify_password(current, user.password_hash):
        raise AppError(400, "INVALID_CURRENT_PASSWORD", "Mot de passe actuel incorrect")
    user.password_hash = hash_password(new)
    db.commit()
