"""Statistiques produit pour l'administration (PRD §33, §39-40 ; CDC F33).

Tout est calculé à la demande depuis les tables métier : pas de pipeline séparé à ce stade.
Définitions documentées dans `definitions` de la réponse pour que les chiffres restent interprétables.
"""

from collections import defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import cast, func, select
from sqlalchemy.orm import Session
from sqlalchemy.types import Date

from app.modules.assessment.models import (
    Assessment,
    AssessmentAttempt,
    AssessmentType,
    AttemptStatus,
    StudentLearningProfile,
)
from app.modules.identity.models import User, UserRole, UserStatus
from app.modules.learning.models import ActivityAttempt, LessonProgress, ProgressStatus
from app.modules.platform.models import Event
from app.modules.progress.models import SkillProgressHistory
from app.modules.speaking.models import (
    AiAnalysis,
    SessionStatus,
    Speaker,
    SpeakingSession,
    SpeakingTurn,
)

SERIES_DAYS = 14

DEFINITIONS = {
    "active": "Élève ayant fait un exercice, une tentative d'oral ou un test de niveau sur la période.",
    "north_star": (
        "Élèves actifs sur 30 jours ayant démontré une progression mesurable : au moins une compétence dont le "
        "dernier score enregistré est supérieur au premier."
    ),
    "funnel": "Nombre d'élèves distincts ayant atteint chaque étape (une étape peut être atteinte sans la précédente).",
}


def _students():
    return select(User.id).where(User.role == UserRole.STUDENT, User.deleted_at.is_(None))


def _count(db: Session, q) -> int:
    return db.scalar(select(func.count()).select_from(q.subquery())) or 0


def _distinct_students(db: Session, col, *where) -> set:
    return set(db.scalars(select(col).where(*where).distinct()))


def _active_ids(db: Session, since: datetime) -> set:
    ids = _distinct_students(db, ActivityAttempt.student_id, ActivityAttempt.attempted_at >= since)
    ids |= set(db.scalars(select(SpeakingSession.student_id)
                          .join(SpeakingTurn, SpeakingTurn.session_id == SpeakingSession.id)
                          .where(SpeakingTurn.created_at >= since).distinct()))
    ids |= _distinct_students(db, AssessmentAttempt.student_id, AssessmentAttempt.completed_at >= since,
                              AssessmentAttempt.status == AttemptStatus.COMPLETED)
    return ids


def _north_star(db: Session, since: datetime, active: set) -> int:
    rows = db.execute(select(SkillProgressHistory.student_id, SkillProgressHistory.skill_id,
                             SkillProgressHistory.score, SkillProgressHistory.recorded_at)
                      .order_by(SkillProgressHistory.recorded_at)).all()
    series = defaultdict(list)
    for student, skill, score, at in rows:
        series[(student, skill)].append((score, at))
    progressing = {st for (st, _), pts in series.items()
                   if st in active and len(pts) >= 2 and pts[-1][0] > pts[0][0] and pts[-1][1] >= since}
    return len(progressing)


def _daily(db: Session, ts_col, since: datetime, *where) -> dict:
    day = cast(func.timezone("UTC", ts_col), Date)
    return {d: n for d, n in db.execute(select(day, func.count()).where(ts_col >= since, *where).group_by(day))}


def compute(db: Session, now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    d7, d30 = now - timedelta(days=7), now - timedelta(days=30)
    students_total = _count(db, _students())
    teachers_total = db.scalar(select(func.count()).select_from(User).where(
        User.role == UserRole.TEACHER, User.deleted_at.is_(None), User.status == UserStatus.ACTIVE))

    def new(since):
        return _count(db, _students().where(User.created_at >= since))

    active7, active30 = _active_ids(db, d7), _active_ids(db, d30)
    placement_done = _distinct_students(
        db, AssessmentAttempt.student_id, AssessmentAttempt.status == AttemptStatus.COMPLETED,
        AssessmentAttempt.assessment_id.in_(select(Assessment.id).where(Assessment.type == AssessmentType.PLACEMENT)))
    funnel_counts = [
        ("registered", "Inscrits", students_total),
        ("onboarded", "Onboarding terminé", len(_distinct_students(
            db, StudentLearningProfile.student_id, StudentLearningProfile.primary_goal.is_not(None)))),
        ("placement", "Test de niveau passé", len(placement_done)),
        ("lesson", "Première leçon commencée", len(_distinct_students(db, LessonProgress.student_id))),
        ("speaking", "Première session d'oral terminée", len(_distinct_students(
            db, SpeakingSession.student_id, SpeakingSession.status == SessionStatus.COMPLETED))),
    ]

    speaking_turns_30 = db.scalar(select(func.count()).select_from(SpeakingTurn).where(
        SpeakingTurn.created_at >= d30, SpeakingTurn.speaker == Speaker.STUDENT))
    avg_score = db.scalar(select(func.avg(AiAnalysis.score)).where(AiAnalysis.created_at >= d30))

    new_by_day = _daily(db, User.created_at, now - timedelta(days=SERIES_DAYS), User.role == UserRole.STUDENT,
                        User.deleted_at.is_(None))
    attempts_by_day = _daily(db, ActivityAttempt.attempted_at, now - timedelta(days=SERIES_DAYS))
    speaking_by_day = _daily(db, SpeakingTurn.created_at, now - timedelta(days=SERIES_DAYS),
                             SpeakingTurn.speaker == Speaker.STUDENT)
    series = []
    for i in range(SERIES_DAYS - 1, -1, -1):
        day = (now - timedelta(days=i)).date()
        series.append({"date": day.isoformat(), "new_students": new_by_day.get(day, 0),
                       "exercises": attempts_by_day.get(day, 0), "speaking_attempts": speaking_by_day.get(day, 0)})

    return {
        "generated_at": now,
        "users": {"students": students_total, "teachers": teachers_total,
                  "new_7d": new(d7), "new_30d": new(d30)},
        "activity": {"active_7d": len(active7), "active_30d": len(active30)},
        "north_star": {"value": _north_star(db, d30, active30), "of_active_30d": len(active30)},
        "funnel": [{"key": k, "label": label, "count": n} for k, label, n in funnel_counts],
        "learning": {
            "lessons_completed": db.scalar(select(func.count()).select_from(LessonProgress).where(
                LessonProgress.status == ProgressStatus.COMPLETED)),
            "exercises_7d": db.scalar(select(func.count()).select_from(ActivityAttempt).where(
                ActivityAttempt.attempted_at >= d7)),
        },
        "speaking": {
            "attempts_30d": speaking_turns_30,
            "average_score_30d": round(float(avg_score), 1) if avg_score is not None else None,
            "ai_calls_30d": db.scalar(select(func.count()).select_from(Event).where(
                Event.event_name == "ai_usage", Event.occurred_at >= d30)),
        },
        "series": series,
        "definitions": DEFINITIONS,
    }
