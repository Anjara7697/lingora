"""Fixtures de test.

Les tests tournent sur une base dédiée `<nom>_test` (créée et migrée automatiquement) :
ils ne touchent jamais la base de développement et partent toujours de tables vides.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError

DEFAULT_URL = "postgresql+psycopg://lingora:lingora@localhost:5432/lingora"
BACKEND_DIR = Path(__file__).resolve().parent.parent


def _prepare_test_database() -> bool:
    url = make_url(os.environ.get("DATABASE_URL") or DEFAULT_URL)
    name = url.database if url.database.endswith("_test") else f"{url.database}_test"
    try:
        admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
        with admin.connect() as conn:
            if not conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": name}).scalar():
                conn.execute(text(f'CREATE DATABASE "{name}"'))
        admin.dispose()
    except OperationalError:
        return False
    os.environ["DATABASE_URL"] = url.set(database=name).render_as_string(hide_password=False)
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"], check=True, cwd=BACKEND_DIR, env=os.environ
    )
    return True


DB_AVAILABLE = _prepare_test_database()  # doit précéder tout import de `app`

from sqlalchemy.orm import Session

from app.core.database import engine


@pytest.fixture
def db():
    """Session PostgreSQL réelle, annulée en fin de test. Ignoré si la base est absente."""
    if not DB_AVAILABLE:
        pytest.skip("PostgreSQL indisponible")
    conn = engine.connect()
    trans = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    trans.rollback()
    conn.close()


@pytest.fixture
def client(db):
    from fastapi.testclient import TestClient

    from app.core.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
