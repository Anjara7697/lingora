import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.models import Base
from app.modules.identity.models import User, UserRole, UserStatus
from app.modules.learning.models import Difficulty, Enrollment, Program


def make_user(email: str, **kw) -> User:
    return User(
        email=email, first_name="A", last_name="B", role=UserRole.STUDENT,
        status=UserStatus.ACTIVE, **kw,
    )


def test_all_model_tables_exist_in_database(db):
    existing = set(inspect(db.connection()).get_table_names())
    assert set(Base.metadata.tables) <= existing


def test_email_is_unique_case_insensitive(db):
    db.add(make_user("Anjara@Example.com"))
    db.flush()
    db.add(make_user("anjara@example.com"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_user_defaults_are_generated_by_database(db):
    u = make_user("x@example.com")
    db.add(u)
    db.flush()
    db.refresh(u)
    assert u.id is not None and u.created_at is not None and u.deleted_at is None


def test_one_enrollment_per_student_and_program(db):
    u, p = make_user("e@example.com"), Program(
        name="English Speaking", slug="english-speaking", difficulty=Difficulty.BEGINNER
    )
    db.add_all([u, p])
    db.flush()
    db.add(Enrollment(student_id=u.id, program_id=p.id))
    db.flush()
    db.add(Enrollment(student_id=u.id, program_id=p.id))
    with pytest.raises(IntegrityError):
        db.flush()
