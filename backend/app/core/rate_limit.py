"""Limitation des tentatives (fenêtre glissante, en mémoire).

Suffisant pour une instance unique ; avec plusieurs processus chaque processus compte séparément.
Redis (architecture §16) la rendra partagée sans changer l'interface.
"""

import threading
import time
from collections import deque

from fastapi import Request

from app.core.config import settings
from app.shared.errors import AppError


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window: float, now: float | None = None) -> tuple[bool, int]:
        """Enregistre une tentative. Retourne (autorisée, secondes avant de pouvoir réessayer)."""
        now = time.monotonic() if now is None else now
        with self._lock:
            q = self._hits.setdefault(key, deque())
            while q and now - q[0] >= window:
                q.popleft()
            if len(q) >= limit:
                return False, max(1, int(window - (now - q[0])) + 1)
            q.append(now)
            if len(self._hits) > 20_000:  # évite une croissance sans limite
                self._prune(now, window)
            return True, 0

    def _prune(self, now: float, window: float) -> None:
        for k in [k for k, q in self._hits.items() if not q or now - q[-1] >= window]:
            del self._hits[k]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request, scope: str, limit: int, window: int, extra: str | None = None) -> None:
    """Lève 429 (avec Retry-After) si la limite est dépassée. `extra` affine la clé (ex. l'email visé)."""
    if not settings.rate_limit_enabled:
        return
    key = f"{scope}:{client_ip(request)}:{(extra or '').lower()}"
    ok, retry_after = limiter.hit(key, limit, window)
    if not ok:
        raise AppError(429, "TOO_MANY_REQUESTS", f"Trop de tentatives. Réessayez dans {retry_after} seconde(s).",
                       headers={"Retry-After": str(retry_after)})
