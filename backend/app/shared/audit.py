"""Traçabilité des opérations sensibles (architecture §18, table audit_logs)."""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.modules.identity.models import User
from app.modules.platform.models import AuditLog


def record_audit(
    db: Session,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    old: dict[str, Any] | None = None,
    new: dict[str, Any] | None = None,
) -> None:
    """Ajoute une ligne d'audit à la transaction en cours (le commit reste à l'appelant)."""
    db.add(AuditLog(user_id=actor.id, action=action, entity_type=entity_type, entity_id=entity_id,
                    old_values=old, new_values=new))
