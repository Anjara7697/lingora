"""Stockage de fichiers (audio...) derrière une interface : local aujourd'hui, objet (S3...) demain.

PostgreSQL ne garde que les métadonnées (table media_files) ; le binaire vit ici.
"""

from app.integrations.storage.base import StorageBackend
from app.integrations.storage.local import LocalStorage

__all__ = ["LocalStorage", "StorageBackend", "get_storage"]


def get_storage() -> StorageBackend:
    from app.core.config import settings

    return LocalStorage(settings.storage_dir)
