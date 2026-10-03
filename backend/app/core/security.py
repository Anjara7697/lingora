from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import settings

_hasher = PasswordHasher()
# Hash factice : vérifié quand l'email est inconnu, pour ne pas révéler son existence par le temps.
DUMMY_HASH = _hasher.hash("lingora-dummy-password")

TokenType = Literal["access", "refresh", "media"]
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_token(user_id: str, token_type: TokenType) -> str:
    """`user_id` est le sujet : un id utilisateur (access/refresh) ou un id de média (media)."""
    delta = {
        "access": timedelta(minutes=settings.access_token_minutes),
        "refresh": timedelta(days=settings.refresh_token_days),
        "media": timedelta(minutes=settings.media_token_minutes),  # URL signée à courte durée de vie
    }[token_type]
    now = datetime.now(UTC)
    # iat_ms : date d'émission à la milliseconde (le `iat` standard n'a que la seconde), pour pouvoir révoquer
    # exactement les jetons émis avant un changement de mot de passe.
    payload = {"sub": user_id, "type": token_type, "iat": now, "iat_ms": int(now.timestamp() * 1000),
               "exp": now + delta}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: TokenType) -> str | None:
    """Retourne l'id utilisateur, ou None si le jeton est invalide/expiré/du mauvais type."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload.get("sub")


def decode_token_claims(token: str, expected_type: TokenType) -> tuple[str, int, bool] | None:
    """Comme decode_token, mais retourne aussi (sub, date d'émission en ms, précise ?).

    `précise` est faux pour un jeton sans `iat_ms` (précision à la seconde seulement).
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type or not payload.get("sub"):
        return None
    if isinstance(payload.get("iat_ms"), int):
        return payload["sub"], payload["iat_ms"], True
    iat = payload.get("iat")
    return payload["sub"], int(iat) * 1000 if isinstance(iat, int | float) else 0, False
