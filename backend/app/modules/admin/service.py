import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.admin import schemas as s
from app.modules.identity.models import User, UserProfile, UserRole, UserStatus
from app.modules.teacher.models import TeacherStudent
from app.shared.audit import record_audit
from app.shared.errors import AppError

STAFF_ROLES = (UserRole.TEACHER, UserRole.ADMIN)


def _user(db: Session, user_id: uuid.UUID) -> User:
    user = db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if not user:
        raise AppError(404, "USER_NOT_FOUND", "Utilisateur introuvable")
    return user


def _active_admin_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User).where(
        User.role == UserRole.ADMIN, User.status == UserStatus.ACTIVE, User.deleted_at.is_(None)))


# ---------- Utilisateurs ----------


def list_users(db: Session, search: str | None, role: UserRole | None, status: UserStatus | None,
               limit: int, offset: int) -> dict:
    q = select(User).where(User.deleted_at.is_(None))
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.where(or_(func.lower(User.first_name).like(like), func.lower(User.last_name).like(like),
                        func.lower(User.email).like(like)))
    if role:
        q = q.where(User.role == role)
    if status:
        q = q.where(User.status == status)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    items = db.scalars(q.order_by(User.created_at.desc()).limit(limit).offset(offset)).all()
    return {"items": items, "total": total}


def create_user(db: Session, actor: User, data: s.CreateUser) -> User:
    user = User(email=data.email, password_hash=hash_password(data.password), first_name=data.first_name.strip(),
                last_name=data.last_name.strip(), role=data.role, status=UserStatus.ACTIVE, profile=UserProfile())
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "EMAIL_ALREADY_USED", "Cet email est déjà utilisé") from None
    record_audit(db, actor, "USER_CREATED", "user", user.id, new={"email": user.email, "role": user.role.value})
    db.commit()
    return user


def update_user(db: Session, actor: User, user_id: uuid.UUID, data: s.UpdateUser) -> User:
    user = _user(db, user_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    new_role, new_status = changes.get("role"), changes.get("status")
    if new_status == UserStatus.DELETED:
        raise AppError(422, "INVALID_STATUS", "Utilisez ACTIVE ou SUSPENDED")

    role_changes = new_role is not None and new_role != user.role
    status_changes = new_status is not None and new_status != user.status
    if user.id == actor.id and (role_changes or status_changes):
        # évite de se verrouiller soi-même hors de l'administration
        raise AppError(409, "CANNOT_MODIFY_SELF", "Vous ne pouvez pas modifier votre propre rôle ou statut")
    leaves_admin = user.role == UserRole.ADMIN and user.status == UserStatus.ACTIVE and (
        (role_changes and new_role != UserRole.ADMIN) or (status_changes and new_status != UserStatus.ACTIVE))
    if leaves_admin and _active_admin_count(db) <= 1:
        raise AppError(409, "LAST_ADMIN", "Il doit rester au moins un administrateur actif")

    old = {"role": user.role.value, "status": user.status.value, "first_name": user.first_name,
           "last_name": user.last_name}
    if role_changes:
        _cleanup_assignments_for_role_change(db, user, new_role)
        user.role = new_role
        record_audit(db, actor, "ROLE_CHANGED", "user", user.id,
                     old={"role": old["role"]}, new={"role": new_role.value})
    if status_changes:
        user.status = new_status
        record_audit(db, actor, "USER_SUSPENDED" if new_status == UserStatus.SUSPENDED else "USER_REACTIVATED",
                     "user", user.id, old={"status": old["status"]}, new={"status": new_status.value})
    for field in ("first_name", "last_name"):
        if field in changes:
            setattr(user, field, changes[field].strip())
    if any(f in changes for f in ("first_name", "last_name")):
        record_audit(db, actor, "USER_UPDATED", "user", user.id,
                     old={k: old[k] for k in ("first_name", "last_name")},
                     new={"first_name": user.first_name, "last_name": user.last_name})
    db.commit()
    return user


def _cleanup_assignments_for_role_change(db: Session, user: User, new_role: UserRole) -> None:
    """Un ancien enseignant n'a plus d'élèves ; un nouvel enseignant n'est plus lui-même suivi."""
    if user.role in STAFF_ROLES and new_role not in STAFF_ROLES:
        for row in db.scalars(select(TeacherStudent).where(TeacherStudent.teacher_id == user.id)):
            db.delete(row)
    if user.role == UserRole.STUDENT and new_role != UserRole.STUDENT:
        for row in db.scalars(select(TeacherStudent).where(TeacherStudent.student_id == user.id)):
            db.delete(row)


def reset_password(db: Session, actor: User, user_id: uuid.UUID, password: str) -> None:
    """Réinitialisation par un admin (en attendant la récupération par email)."""
    user = _user(db, user_id)
    user.password_hash = hash_password(password)
    record_audit(db, actor, "PASSWORD_RESET_BY_ADMIN", "user", user.id)
    db.commit()


# ---------- Assignation élèves -> enseignants ----------


def _teacher(db: Session, teacher_id: uuid.UUID) -> User:
    teacher = _user(db, teacher_id)
    if teacher.role not in STAFF_ROLES:
        raise AppError(422, "NOT_A_TEACHER", "Cet utilisateur n'est pas enseignant")
    return teacher


def _teacher_item(db: Session, teacher: User) -> dict:
    count = db.scalar(select(func.count()).select_from(TeacherStudent).where(TeacherStudent.teacher_id == teacher.id))
    return {"id": teacher.id, "first_name": teacher.first_name, "last_name": teacher.last_name,
            "email": teacher.email, "student_count": count}


def list_teachers(db: Session) -> list[dict]:
    teachers = db.scalars(select(User).where(User.role == UserRole.TEACHER, User.deleted_at.is_(None),
                                             User.status == UserStatus.ACTIVE).order_by(User.last_name))
    return [_teacher_item(db, t) for t in teachers]


def roster(db: Session, teacher_id: uuid.UUID, search: str | None) -> dict:
    teacher = _teacher(db, teacher_id)
    assigned_ids = select(TeacherStudent.student_id).where(TeacherStudent.teacher_id == teacher.id)
    base = select(User).where(User.role == UserRole.STUDENT, User.deleted_at.is_(None),
                              User.status == UserStatus.ACTIVE)
    assigned = db.scalars(base.where(User.id.in_(assigned_ids)).order_by(User.last_name)).all()
    avail_q = base.where(User.id.not_in(assigned_ids))
    if search:
        like = f"%{search.strip().lower()}%"
        avail_q = avail_q.where(or_(func.lower(User.first_name).like(like), func.lower(User.last_name).like(like),
                                    func.lower(User.email).like(like)))
    available = db.scalars(avail_q.order_by(User.last_name).limit(100)).all()
    return {"teacher": _teacher_item(db, teacher), "assigned": assigned, "available": available}


def assign_students(db: Session, actor: User, teacher_id: uuid.UUID, student_ids: list[uuid.UUID]) -> int:
    teacher = _teacher(db, teacher_id)
    students = db.scalars(select(User).where(User.id.in_(student_ids), User.role == UserRole.STUDENT,
                                             User.deleted_at.is_(None), User.status == UserStatus.ACTIVE)).all()
    if len(students) != len(set(student_ids)):
        raise AppError(422, "INVALID_STUDENTS", "Un ou plusieurs identifiants ne sont pas des élèves actifs")
    already = set(db.scalars(select(TeacherStudent.student_id).where(
        TeacherStudent.teacher_id == teacher.id, TeacherStudent.student_id.in_(student_ids))))
    added = [st for st in students if st.id not in already]
    for st in added:
        db.add(TeacherStudent(teacher_id=teacher.id, student_id=st.id))
    if added:
        record_audit(db, actor, "STUDENTS_ASSIGNED", "user", teacher.id,
                     new={"student_ids": [str(st.id) for st in added]})
    db.commit()
    return len(added)


def unassign_student(db: Session, actor: User, teacher_id: uuid.UUID, student_id: uuid.UUID) -> None:
    teacher = _teacher(db, teacher_id)
    row = db.scalar(select(TeacherStudent).where(TeacherStudent.teacher_id == teacher.id,
                                                 TeacherStudent.student_id == student_id))
    if not row:
        raise AppError(404, "ASSIGNMENT_NOT_FOUND", "Cet élève n'est pas assigné à cet enseignant")
    db.delete(row)
    record_audit(db, actor, "STUDENT_UNASSIGNED", "user", teacher.id, old={"student_id": str(student_id)})
    db.commit()
