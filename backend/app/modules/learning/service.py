import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.identity.models import User
from app.modules.learning import grading
from app.modules.learning.models import (
    Activity,
    ActivityAttempt,
    Content,
    Course,
    CourseProgress,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    LessonContent,
    LessonProgress,
    Program,
    ProgressStatus,
)
from app.modules.platform.models import Event
from app.shared.errors import AppError


def _pct(done: int, total: int) -> Decimal:
    return Decimal(round(done * 100 / total, 2)) if total else Decimal(0)


def _log(db: Session, user: User, name: str, entity_type: str, entity_id: uuid.UUID, **props):
    db.add(
        Event(
            user_id=user.id,
            event_name=name,
            entity_type=entity_type,
            entity_id=entity_id,
            properties=props or None,
        )
    )


# ---------- Catalogue ----------


def _published_lessons_query(program_id: uuid.UUID | None = None, course_id: uuid.UUID | None = None):
    q = (
        select(Lesson)
        .join(Course, Lesson.course_id == Course.id)
        .join(Program, Course.program_id == Program.id)
        .where(
            Lesson.deleted_at.is_(None), Lesson.is_published,
            Course.deleted_at.is_(None), Course.is_published,
            Program.deleted_at.is_(None), Program.is_published,
        )
        .order_by(Course.position, Lesson.position)
    )
    if program_id:
        q = q.where(Course.program_id == program_id)
    if course_id:
        q = q.where(Lesson.course_id == course_id)
    return q


def list_programs(db: Session) -> list[dict]:
    programs = db.scalars(
        select(Program)
        .where(Program.deleted_at.is_(None), Program.is_published)
        .order_by(Program.created_at)
    ).all()
    out = []
    for p in programs:
        lessons = db.scalars(_published_lessons_query(program_id=p.id)).all()
        courses = {lesson.course_id for lesson in lessons}
        out.append({"program": p, "course_count": len(courses), "lesson_count": len(lessons)})
    return out


def _get_published_program(db: Session, slug: str) -> Program:
    program = db.scalar(
        select(Program).where(
            Program.slug == slug, Program.deleted_at.is_(None), Program.is_published
        )
    )
    if not program:
        raise AppError(404, "PROGRAM_NOT_FOUND", "Programme introuvable")
    return program


def get_enrollment(db: Session, user: User, program_id: uuid.UUID) -> Enrollment | None:
    return db.scalar(
        select(Enrollment).where(Enrollment.student_id == user.id, Enrollment.program_id == program_id)
    )


def get_program_detail(db: Session, slug: str, user: User | None) -> dict:
    program = _get_published_program(db, slug)
    lessons = db.scalars(_published_lessons_query(program_id=program.id)).all()
    courses = db.scalars(
        select(Course)
        .where(Course.program_id == program.id, Course.deleted_at.is_(None), Course.is_published)
        .order_by(Course.position)
    ).all()
    statuses: dict[uuid.UUID, ProgressStatus] = {}
    enrollment = None
    if user:
        enrollment = get_enrollment(db, user, program.id)
        rows = db.scalars(
            select(LessonProgress).where(
                LessonProgress.student_id == user.id,
                LessonProgress.lesson_id.in_([lesson.id for lesson in lessons]),
            )
        ).all()
        statuses = {r.lesson_id: r.status for r in rows}
    course_items = []
    for c in courses:
        items = [
            {"lesson": lesson, "status": statuses.get(lesson.id, ProgressStatus.AVAILABLE)}
            for lesson in lessons
            if lesson.course_id == c.id
        ]
        course_items.append({"course": c, "lessons": items})
    return {"program": program, "courses": course_items, "enrollment": enrollment}


# ---------- Inscription ----------


def enroll(db: Session, user: User, program_id: uuid.UUID) -> Enrollment:
    program = db.scalar(
        select(Program).where(
            Program.id == program_id, Program.deleted_at.is_(None), Program.is_published
        )
    )
    if not program:
        raise AppError(404, "PROGRAM_NOT_FOUND", "Programme introuvable")
    enrollment = get_enrollment(db, user, program.id)
    now = datetime.now().astimezone()
    if enrollment is None:
        enrollment = Enrollment(student_id=user.id, program_id=program.id, started_at=now)
        db.add(enrollment)
        _log(db, user, "program_enrolled", "program", program.id)
    elif enrollment.status in (EnrollmentStatus.PAUSED, EnrollmentStatus.CANCELLED):
        enrollment.status = EnrollmentStatus.ACTIVE  # réinscription : l'historique est conservé
    db.commit()
    db.refresh(enrollment)
    return enrollment


def my_enrollments(db: Session, user: User) -> list[tuple[Enrollment, Program]]:
    rows = db.execute(
        select(Enrollment, Program)
        .join(Program, Enrollment.program_id == Program.id)
        .where(Enrollment.student_id == user.id)
        .order_by(Enrollment.created_at)
    ).all()
    return [(e, p) for e, p in rows]


def _require_lesson_access(db: Session, user: User, lesson_id: uuid.UUID) -> tuple[Lesson, Course, Program]:
    row = db.execute(
        select(Lesson, Course, Program)
        .join(Course, Lesson.course_id == Course.id)
        .join(Program, Course.program_id == Program.id)
        .where(
            Lesson.id == lesson_id,
            Lesson.deleted_at.is_(None), Lesson.is_published,
            Course.deleted_at.is_(None), Course.is_published,
            Program.deleted_at.is_(None), Program.is_published,
        )
    ).first()
    if not row:
        raise AppError(404, "LESSON_NOT_FOUND", "Leçon introuvable")
    lesson, course, program = row
    enrollment = get_enrollment(db, user, program.id)
    if not enrollment or enrollment.status not in (EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED):
        raise AppError(403, "NOT_ENROLLED", "Inscrivez-vous au programme pour accéder à cette leçon")
    return lesson, course, program


# ---------- Leçon ----------


def _activity_stats(db: Session, user_id: uuid.UUID, activity_ids: list[uuid.UUID]) -> dict:
    if not activity_ids:
        return {}
    rows = db.execute(
        select(
            ActivityAttempt.activity_id,
            func.bool_or(ActivityAttempt.is_correct),
            func.max(ActivityAttempt.score),
            func.count(),
        )
        .where(ActivityAttempt.student_id == user_id, ActivityAttempt.activity_id.in_(activity_ids))
        .group_by(ActivityAttempt.activity_id)
    ).all()
    return {r[0]: {"any_correct": bool(r[1]), "best_score": r[2], "attempts": r[3]} for r in rows}


def _is_mastered(activity: Activity, stats: dict) -> bool:
    st = stats.get(activity.id)
    if not st:
        return False
    if grading.is_auto_graded(activity.type, activity.configuration or {}):
        return st["any_correct"]
    return True  # activité non corrigée automatiquement : une tentative suffit


def _next_lesson(db: Session, lesson: Lesson, course: Course) -> Lesson | None:
    ordered = db.scalars(_published_lessons_query(program_id=course.program_id)).all()
    ids = [lesson_.id for lesson_ in ordered]
    i = ids.index(lesson.id)
    return ordered[i + 1] if i + 1 < len(ordered) else None


def get_lesson_detail(db: Session, user: User, lesson_id: uuid.UUID) -> dict:
    lesson, course, program = _require_lesson_access(db, user, lesson_id)
    contents = db.execute(
        select(Content, LessonContent.position)
        .join(LessonContent, LessonContent.content_id == Content.id)
        .where(LessonContent.lesson_id == lesson.id)
        .order_by(LessonContent.position)
    ).all()
    activities = db.scalars(
        select(Activity)
        .where(Activity.lesson_id == lesson.id, Activity.deleted_at.is_(None))
        .order_by(Activity.position)
    ).all()
    stats = _activity_stats(db, user.id, [a.id for a in activities])
    items = []
    for a in activities:
        cfg = a.configuration or {}
        st = stats.get(a.id, {})
        items.append(
            {
                "activity": a,
                "config": grading.public_config(a.type, cfg, seed=str(a.id)),
                "graded": grading.is_auto_graded(a.type, cfg),
                "mastered": _is_mastered(a, stats),
                "attempts": st.get("attempts", 0),
            }
        )
    progress = db.scalar(
        select(LessonProgress).where(
            LessonProgress.student_id == user.id, LessonProgress.lesson_id == lesson.id
        )
    )
    return {
        "lesson": lesson,
        "course": course,
        "program": program,
        "contents": [c for c, _ in contents],
        "activities": items,
        "progress": progress,
        "next_lesson": _next_lesson(db, lesson, course),
    }


# ---------- Soumission & progression ----------


def submit_activity(
    db: Session, user: User, activity_id: uuid.UUID, answer: Any, duration_seconds: int | None
) -> dict:
    activity = db.scalar(
        select(Activity).where(Activity.id == activity_id, Activity.deleted_at.is_(None))
    )
    if not activity:
        raise AppError(404, "ACTIVITY_NOT_FOUND", "Activité introuvable")
    lesson, course, program = _require_lesson_access(db, user, activity.lesson_id)

    cfg = activity.configuration or {}
    result = grading.grade(activity.type, cfg, answer)
    score = (
        Decimal(activity.points) if result.is_correct else Decimal(0)
    ) if result.graded else None
    db.add(
        ActivityAttempt(
            student_id=user.id,
            activity_id=activity.id,
            answer=answer if isinstance(answer, dict | list) else {"value": answer},
            is_correct=result.is_correct,
            score=score,
            duration_seconds=duration_seconds,
        )
    )
    db.flush()
    progress, newly_completed = recompute_progress(db, user, lesson, course, program)
    db.commit()
    return {
        "graded": result.graded,
        "is_correct": result.is_correct,
        "score": score,
        "points": activity.points,
        "correct_answer": result.correct_answer,
        "explanation": cfg.get("explanation") if result.graded else None,
        "lesson_progress": progress,
        "lesson_completed": newly_completed,
    }


def recompute_progress(
    db: Session, user: User, lesson: Lesson, course: Course, program: Program
) -> tuple[LessonProgress, bool]:
    """Recalcule leçon -> cours -> inscription à partir des tentatives réelles (RB-03/RB-04)."""
    now = datetime.now().astimezone()
    activities = db.scalars(
        select(Activity).where(Activity.lesson_id == lesson.id, Activity.deleted_at.is_(None))
    ).all()
    stats = _activity_stats(db, user.id, [a.id for a in activities])
    mastered = sum(1 for a in activities if _is_mastered(a, stats))

    lp = db.scalar(
        select(LessonProgress).where(
            LessonProgress.student_id == user.id, LessonProgress.lesson_id == lesson.id
        )
    )
    if lp is None:
        lp = LessonProgress(student_id=user.id, lesson_id=lesson.id, started_at=now)
        db.add(lp)
        _log(db, user, "lesson_started", "lesson", lesson.id)
    complete = bool(activities) and mastered == len(activities)
    newly_completed = complete and lp.status != ProgressStatus.COMPLETED
    lp.progress_percentage = _pct(mastered, len(activities))
    lp.last_activity_at = now
    if complete:
        lp.status = ProgressStatus.COMPLETED
        lp.completed_at = lp.completed_at or now
    elif lp.status != ProgressStatus.COMPLETED:
        lp.status = ProgressStatus.IN_PROGRESS
    if newly_completed:
        _log(db, user, "lesson_completed", "lesson", lesson.id)
    db.flush()

    _recompute_course(db, user, course, now)
    _recompute_enrollment(db, user, program, now)
    return lp, newly_completed


def _completed_lesson_ids(db: Session, user: User, lesson_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    if not lesson_ids:
        return set()
    return set(
        db.scalars(
            select(LessonProgress.lesson_id).where(
                LessonProgress.student_id == user.id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.status == ProgressStatus.COMPLETED,
            )
        )
    )


def _recompute_course(db: Session, user: User, course: Course, now: datetime) -> None:
    lessons = db.scalars(_published_lessons_query(course_id=course.id)).all()
    ids = [lesson.id for lesson in lessons]
    done = _completed_lesson_ids(db, user, ids)
    acts = db.scalars(
        select(Activity).where(Activity.lesson_id.in_(ids), Activity.deleted_at.is_(None))
    ).all()
    graded = [a for a in acts if grading.is_auto_graded(a.type, a.configuration or {})]
    best = {}
    if graded:
        best = dict(
            db.execute(
                select(ActivityAttempt.activity_id, func.max(ActivityAttempt.score))
                .where(
                    ActivityAttempt.student_id == user.id,
                    ActivityAttempt.activity_id.in_([a.id for a in graded]),
                )
                .group_by(ActivityAttempt.activity_id)
            ).all()
        )
    total_points = sum(a.points for a in graded)
    earned = sum(best.get(a.id) or 0 for a in graded)
    cp = db.scalar(
        select(CourseProgress).where(
            CourseProgress.student_id == user.id, CourseProgress.course_id == course.id
        )
    )
    if cp is None:
        cp = CourseProgress(student_id=user.id, course_id=course.id)
        db.add(cp)
    cp.progress_percentage = _pct(len(done), len(ids))
    cp.score = _pct(earned, total_points) if total_points else None
    cp.last_activity_at = now
    if ids and len(done) == len(ids):
        cp.completed_at = cp.completed_at or now


def _recompute_enrollment(db: Session, user: User, program: Program, now: datetime) -> None:
    enrollment = get_enrollment(db, user, program.id)
    if not enrollment:
        return
    ids = [lesson.id for lesson in db.scalars(_published_lessons_query(program_id=program.id))]
    done = _completed_lesson_ids(db, user, ids)
    enrollment.progress_percentage = _pct(len(done), len(ids))
    if ids and len(done) == len(ids):
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.completed_at = enrollment.completed_at or now


# ---------- Prochaine étape ----------


def next_step(db: Session, user: User) -> dict | None:
    """Prochaine leçon non terminée du programme actif (règle déterministe, côté serveur)."""
    enrollment = db.scalar(
        select(Enrollment)
        .where(Enrollment.student_id == user.id, Enrollment.status == EnrollmentStatus.ACTIVE)
        .order_by(Enrollment.created_at)
    )
    if not enrollment:
        return None
    lessons = db.scalars(_published_lessons_query(program_id=enrollment.program_id)).all()
    done = _completed_lesson_ids(db, user, [lesson.id for lesson in lessons])
    target = next((lesson for lesson in lessons if lesson.id not in done), None)
    program = db.get(Program, enrollment.program_id)
    course = db.get(Course, target.course_id) if target else None
    return {"enrollment": enrollment, "program": program, "lesson": target, "course": course}
