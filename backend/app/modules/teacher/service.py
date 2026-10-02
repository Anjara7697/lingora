import enum
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.assessment.models import (
    Assessment,
    AssessmentAttempt,
    AssessmentType,
    AttemptStatus,
    StudentLearningProfile,
)
from app.modules.identity.models import User, UserRole, UserStatus
from app.modules.learning.models import (
    Activity,
    ActivityAttempt,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    Program,
    Skill,
)
from app.modules.platform.models import Event, Notification, NotificationChannel, NotificationStatus
from app.modules.progress.models import StudentSkillProgress
from app.modules.speaking import service as speaking_service
from app.modules.speaking.models import (
    SpeakingFeedback,
    SpeakingScenario,
    SpeakingSession,
    SpeakingTurn,
    TeacherFeedback,
)
from app.modules.teacher.models import TeacherStudent
from app.shared.errors import AppError

LOW_ACTIVITY_AFTER = timedelta(days=7)
INACTIVE_AFTER = timedelta(days=14)
SPEAKING_WEAK_BELOW = 50


class StudentStatus(enum.Enum):
    NEW = "NEW"
    ON_TRACK = "ON_TRACK"
    LOW_ACTIVITY = "LOW_ACTIVITY"
    SPEAKING_DIFFICULTY = "SPEAKING_DIFFICULTY"
    INACTIVE = "INACTIVE"


# Ordre d'attention : ce qui demande l'intervention de l'enseignant d'abord.
ATTENTION_ORDER = [
    StudentStatus.INACTIVE, StudentStatus.LOW_ACTIVITY, StudentStatus.SPEAKING_DIFFICULTY,
]


def classify(
    last_activity: datetime | None, speaking_score: float | None, assigned_at: datetime, now: datetime
) -> StudentStatus:
    """Statut unique d'un élève (CDC F25). Règle déterministe, documentée et testée."""
    if last_activity is None:
        return StudentStatus.NEW if now - assigned_at < LOW_ACTIVITY_AFTER else StudentStatus.INACTIVE
    idle = now - last_activity
    if idle >= INACTIVE_AFTER:
        return StudentStatus.INACTIVE
    if idle >= LOW_ACTIVITY_AFTER:
        return StudentStatus.LOW_ACTIVITY
    if speaking_score is not None and speaking_score < SPEAKING_WEAK_BELOW:
        return StudentStatus.SPEAKING_DIFFICULTY
    return StudentStatus.ON_TRACK


# ---------- Accès : un enseignant ne voit QUE ses élèves ----------


def _roster_query(teacher: User):
    base = select(User, User.created_at.label("assigned_at")).where(
        User.role == UserRole.STUDENT, User.deleted_at.is_(None), User.status == UserStatus.ACTIVE
    )
    if teacher.role == UserRole.ADMIN:  # l'administrateur voit tous les élèves
        return base
    return (
        select(User, TeacherStudent.assigned_at.label("assigned_at"))
        .join(TeacherStudent, TeacherStudent.student_id == User.id)
        .where(TeacherStudent.teacher_id == teacher.id, User.deleted_at.is_(None),
               User.status == UserStatus.ACTIVE)
    )


def student_for_teacher(db: Session, teacher: User, student_id: uuid.UUID) -> User:
    row = db.execute(_roster_query(teacher).where(User.id == student_id)).first()
    if not row:  # 404 (pas 403) : on ne révèle pas l'existence d'un élève qui n'est pas le sien
        raise AppError(404, "STUDENT_NOT_FOUND", "Élève introuvable")
    return row[0]


# ---------- Liste & tableau de bord ----------


def _last_activity(db: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, datetime]:
    out: dict[uuid.UUID, datetime] = {}

    def merge(rows):
        for sid, ts in rows:
            if ts and (sid not in out or ts > out[sid]):
                out[sid] = ts

    merge(db.execute(select(ActivityAttempt.student_id, func.max(ActivityAttempt.attempted_at))
                     .where(ActivityAttempt.student_id.in_(ids)).group_by(ActivityAttempt.student_id)))
    merge(db.execute(select(SpeakingSession.student_id, func.max(SpeakingTurn.created_at))
                     .join(SpeakingTurn, SpeakingTurn.session_id == SpeakingSession.id)
                     .where(SpeakingSession.student_id.in_(ids)).group_by(SpeakingSession.student_id)))
    merge(db.execute(select(AssessmentAttempt.student_id, func.max(AssessmentAttempt.completed_at))
                     .where(AssessmentAttempt.student_id.in_(ids),
                            AssessmentAttempt.status == AttemptStatus.COMPLETED)
                     .group_by(AssessmentAttempt.student_id)))
    return out


def student_rows(db: Session, teacher: User, now: datetime | None = None) -> list[dict]:
    now = now or datetime.now().astimezone()
    base = db.execute(_roster_query(teacher)).all()
    if not base:
        return []
    ids = [u.id for u, _ in base]
    last = _last_activity(db, ids)
    progress = dict(db.execute(
        select(Enrollment.student_id, func.avg(Enrollment.progress_percentage))
        .where(Enrollment.student_id.in_(ids),
               Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]))
        .group_by(Enrollment.student_id)).all())
    levels = dict(db.execute(select(StudentLearningProfile.student_id, StudentLearningProfile.current_level)
                             .where(StudentLearningProfile.student_id.in_(ids))).all())
    speaking = dict(db.execute(
        select(StudentSkillProgress.student_id, StudentSkillProgress.score)
        .join(Skill, Skill.id == StudentSkillProgress.skill_id)
        .where(StudentSkillProgress.student_id.in_(ids), Skill.code == "SPEAKING")).all())
    rows = []
    for user, assigned_at in base:
        sp = float(speaking[user.id]) if user.id in speaking else None
        rows.append({
            "id": user.id, "first_name": user.first_name, "last_name": user.last_name, "email": user.email,
            "level": levels.get(user.id),
            "progress": float(progress[user.id]) if user.id in progress else None,
            "speaking_score": sp,
            "last_activity_at": last.get(user.id),
            "status": classify(last.get(user.id), sp, assigned_at, now),
        })
    return sorted(rows, key=lambda r: (r["last_name"].lower(), r["first_name"].lower()))


def list_students(db: Session, teacher: User, search: str | None, status: StudentStatus | None) -> list[dict]:
    rows = student_rows(db, teacher)
    if search:
        q = search.strip().lower()
        rows = [r for r in rows if q in f"{r['first_name']} {r['last_name']} {r['email']}".lower()]
    if status:
        rows = [r for r in rows if r["status"] == status]
    return rows


def dashboard(db: Session, teacher: User) -> dict:
    rows = student_rows(db, teacher)
    now = datetime.now().astimezone()
    counts = {s.value: 0 for s in StudentStatus}
    for r in rows:
        counts[r["status"].value] += 1
    progresses = [r["progress"] for r in rows if r["progress"] is not None]
    active = sum(1 for r in rows if r["last_activity_at"] and now - r["last_activity_at"] < LOW_ACTIVITY_AFTER)
    attention = sorted(
        (r for r in rows if r["status"] in ATTENTION_ORDER),
        key=lambda r: (ATTENTION_ORDER.index(r["status"]), r["last_activity_at"] or datetime.min.replace(tzinfo=UTC)),
    )
    return {
        "total_students": len(rows),
        "active_students": active,
        "average_progress": round(sum(progresses) / len(progresses), 1) if progresses else None,
        "status_counts": counts,
        "needs_attention": attention[:5],
    }


# ---------- Fiche élève ----------


def student_detail(db: Session, teacher: User, student_id: uuid.UUID) -> dict:
    student = student_for_teacher(db, teacher, student_id)
    row = next(r for r in student_rows(db, teacher) if r["id"] == student.id)
    profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.student_id == student.id))
    skills = [
        {"code": s.code, "name": s.name, "score": p.score, "level": p.level, "last_assessed_at": p.last_assessed_at}
        for p, s in db.execute(select(StudentSkillProgress, Skill)
                               .join(Skill, Skill.id == StudentSkillProgress.skill_id)
                               .where(StudentSkillProgress.student_id == student.id)
                               .order_by(Skill.code))
    ]
    enrollments = [
        {"program_name": pr.name, "program_slug": pr.slug, "status": e.status, "progress": e.progress_percentage}
        for e, pr in db.execute(select(Enrollment, Program).join(Program, Program.id == Enrollment.program_id)
                                .where(Enrollment.student_id == student.id).order_by(Enrollment.created_at))
    ]
    placements = [
        {"attempt_id": a.id, "completed_at": a.completed_at, "level": (a.metadata_ or {}).get("overall_level"),
         "score": a.score}
        for a in db.scalars(select(AssessmentAttempt)
                            .join(Assessment, Assessment.id == AssessmentAttempt.assessment_id)
                            .where(AssessmentAttempt.student_id == student.id,
                                   Assessment.type == AssessmentType.PLACEMENT,
                                   AssessmentAttempt.status == AttemptStatus.COMPLETED)
                            .order_by(AssessmentAttempt.completed_at.desc()))
    ]
    recent = [
        {"activity_title": act.title, "lesson_title": les.title, "is_correct": att.is_correct,
         "score": att.score, "attempted_at": att.attempted_at}
        for att, act, les in db.execute(
            select(ActivityAttempt, Activity, Lesson)
            .join(Activity, Activity.id == ActivityAttempt.activity_id)
            .join(Lesson, Lesson.id == Activity.lesson_id)
            .where(ActivityAttempt.student_id == student.id)
            .order_by(ActivityAttempt.attempted_at.desc()).limit(10))
    ]
    sessions = []
    for sess, scenario in db.execute(
        select(SpeakingSession, SpeakingScenario)
        .join(SpeakingScenario, SpeakingScenario.id == SpeakingSession.scenario_id)
        .where(SpeakingSession.student_id == student.id).order_by(SpeakingSession.started_at.desc()).limit(20)
    ):
        view = speaking_service.session_view(db, sess)
        scores = [t["overall_score"] for t in view["turns"] if t["overall_score"] is not None]
        sessions.append({"id": sess.id, "scenario_title": scenario.title, "status": sess.status,
                         "started_at": sess.started_at, "attempts": len(view["turns"]),
                         "last_score": scores[-1] if scores else None})
    return {
        "student": {"id": student.id, "first_name": student.first_name, "last_name": student.last_name,
                    "email": student.email, "created_at": student.created_at},
        "status": row["status"], "last_activity_at": row["last_activity_at"],
        "current_level": profile.current_level if profile else None,
        "primary_goal": profile.primary_goal if profile else None,
        "skills": skills, "enrollments": enrollments, "placements": placements,
        "recent_attempts": recent, "speaking_sessions": sessions,
        "feedback": feedback_for_student(db, student.id),
    }


def speaking_session_detail(db: Session, teacher: User, student_id: uuid.UUID, session_id: uuid.UUID) -> dict:
    student = student_for_teacher(db, teacher, student_id)
    session = db.scalar(select(SpeakingSession).where(SpeakingSession.id == session_id,
                                                      SpeakingSession.student_id == student.id))
    if not session:
        raise AppError(404, "SESSION_NOT_FOUND", "Session introuvable")
    return {**speaking_service.session_view(db, session),
            "student": {"id": student.id, "first_name": student.first_name, "last_name": student.last_name},
            "teacher_feedback": feedback_for_student(db, student.id, session_id=session.id)}


# ---------- Feedback humain ----------


def feedback_for_student(db: Session, student_id: uuid.UUID, session_id: uuid.UUID | None = None) -> list[dict]:
    q = (select(TeacherFeedback, User)
         .join(User, User.id == TeacherFeedback.teacher_id)
         .where(TeacherFeedback.student_id == student_id)
         .order_by(TeacherFeedback.created_at.desc()))
    if session_id:
        q = q.where(TeacherFeedback.speaking_session_id == session_id)
    return [
        {"id": f.id, "teacher_name": f"{t.first_name} {t.last_name}", "comment": f.comment, "score": f.score,
         "speaking_session_id": f.speaking_session_id, "lesson_id": f.lesson_id, "created_at": f.created_at}
        for f, t in db.execute(q)
    ]


def add_feedback(db: Session, teacher: User, student_id: uuid.UUID, comment: str, score,
                 speaking_session_id: uuid.UUID | None, lesson_id: uuid.UUID | None) -> dict:
    student = student_for_teacher(db, teacher, student_id)
    if speaking_session_id and not db.scalar(select(SpeakingSession.id).where(
            SpeakingSession.id == speaking_session_id, SpeakingSession.student_id == student.id)):
        raise AppError(404, "SESSION_NOT_FOUND", "Session introuvable")
    if lesson_id and not db.get(Lesson, lesson_id):
        raise AppError(404, "LESSON_NOT_FOUND", "Leçon introuvable")

    fb = TeacherFeedback(student_id=student.id, teacher_id=teacher.id, comment=comment.strip(), score=score,
                         speaking_session_id=speaking_session_id, lesson_id=lesson_id)
    db.add(fb)
    db.flush()
    if speaking_session_id:  # l'enseignant « valide » le feedback IA de cette session
        ai = db.scalar(select(SpeakingFeedback).where(SpeakingFeedback.session_id == speaking_session_id))
        if ai:
            ai.reviewed_by = teacher.id
    now = datetime.now().astimezone()
    db.add(Notification(
        user_id=student.id, type="TEACHER_FEEDBACK", channel=NotificationChannel.IN_APP,
        status=NotificationStatus.SENT, sent_at=now,
        title=f"Nouveau feedback de {teacher.first_name} {teacher.last_name}", message=fb.comment[:200],
        metadata_={"feedback_id": str(fb.id), "speaking_session_id": str(speaking_session_id) if speaking_session_id else None},
    ))
    db.add(Event(user_id=teacher.id, event_name="teacher_feedback_created", entity_type="teacher_feedback",
                 entity_id=fb.id, properties={"student_id": str(student.id)}))
    db.commit()
    return next(f for f in feedback_for_student(db, student.id) if f["id"] == fb.id)
