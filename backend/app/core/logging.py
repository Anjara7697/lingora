import logging
import sys


def configure_logging() -> None:
    """Journaux applicatifs sur la sortie standard (visibles avec `docker compose logs backend`)."""
    root = logging.getLogger("lingora")
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    root.propagate = False
