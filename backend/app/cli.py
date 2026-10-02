"""Administration en ligne de commande (avant l'interface d'admin).

    python -m app.cli create-user EMAIL --role TEACHER --password ... [--first-name X --last-name Y]
    python -m app.cli set-role EMAIL ROLE
    python -m app.cli assign TEACHER_EMAIL STUDENT_EMAIL
    python -m app.cli assign-all TEACHER_EMAIL        # tous les élèves actuels (pratique en test)
"""

import argparse
import sys

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.identity.models import User, UserProfile, UserRole, UserStatus
from app.modules.teacher.models import TeacherStudent


def _user(db, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if not user:
        sys.exit(f"Utilisateur introuvable : {email}")
    return user


def _assign(db, teacher: User, student: User) -> bool:
    if teacher.role not in (UserRole.TEACHER, UserRole.ADMIN):
        sys.exit(f"{teacher.email} n'est pas enseignant (rôle {teacher.role.value})")
    if student.role != UserRole.STUDENT:
        sys.exit(f"{student.email} n'est pas un élève (rôle {student.role.value})")
    exists = db.scalar(select(TeacherStudent.id).where(
        TeacherStudent.teacher_id == teacher.id, TeacherStudent.student_id == student.id))
    if exists:
        return False
    db.add(TeacherStudent(teacher_id=teacher.id, student_id=student.id))
    return True


def create_user(db, email, role, password, first_name, last_name) -> User:
    user = User(email=email, password_hash=hash_password(password), first_name=first_name, last_name=last_name,
                role=UserRole(role), status=UserStatus.ACTIVE, profile=UserProfile())
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        sys.exit(f"Cet email existe déjà : {email}")
    return user


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create-user")
    c.add_argument("email")
    c.add_argument("--role", choices=[r.value for r in UserRole], default="STUDENT")
    c.add_argument("--password", required=True)
    c.add_argument("--first-name", default="Prénom")
    c.add_argument("--last-name", default="Nom")
    r = sub.add_parser("set-role")
    r.add_argument("email")
    r.add_argument("role", choices=[x.value for x in UserRole])
    a = sub.add_parser("assign")
    a.add_argument("teacher_email")
    a.add_argument("student_email")
    aa = sub.add_parser("assign-all")
    aa.add_argument("teacher_email")
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        if args.cmd == "create-user":
            if len(args.password) < 8:
                sys.exit("Mot de passe trop court (8 caractères minimum)")
            u = create_user(db, args.email, args.role, args.password, args.first_name, args.last_name)
            print(f"Créé : {u.email} ({u.role.value})")
        elif args.cmd == "set-role":
            user = _user(db, args.email)
            user.role = UserRole(args.role)
            db.commit()
            print(f"{user.email} est maintenant {args.role}")
        elif args.cmd == "assign":
            added = _assign(db, _user(db, args.teacher_email), _user(db, args.student_email))
            db.commit()
            print("Assigné." if added else "Déjà assigné.")
        elif args.cmd == "assign-all":
            teacher = _user(db, args.teacher_email)
            students = db.scalars(select(User).where(User.role == UserRole.STUDENT, User.deleted_at.is_(None))).all()
            added = sum(_assign(db, teacher, s) for s in students)
            db.commit()
            print(f"{added} élève(s) assigné(s) ({len(students)} au total).")


if __name__ == "__main__":
    main()
