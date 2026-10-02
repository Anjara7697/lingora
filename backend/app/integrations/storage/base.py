from typing import Protocol


class StorageBackend(Protocol):
    provider: str

    def put(self, key: str, data: bytes) -> None: ...

    def get(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...
