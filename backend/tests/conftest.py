import pytest
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.database import engine


@pytest.fixture
def db():
    """Session PostgreSQL réelle, annulée en fin de test. Ignoré si la base est absente."""
    try:
        conn = engine.connect()
    except OperationalError:
        pytest.skip("PostgreSQL indisponible")
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
