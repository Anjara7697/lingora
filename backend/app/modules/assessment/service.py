import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.assessment import level as levels
from app.modules.assessment.models import (
    Assessment,
    AssessmentAnswer,
    AssessmentAttempt,
    AssessmentQuestion,
    AssessmentSkillScore,
    AssessmentType,
    AttemptStatus,
    StudentLearningProfile,
)
from app.modules.identity.models import User
from app.modules.learning import grading
from app.modules.learning.models import Activity, CefrLevel, Program, Skill
from app.modules.platform.models import Event
from app.modules.progress.models import SkillProgressHistory, SkillSourceType, StudentSkillProgress
from app.shared.errors import AppError

LEVEL_RANK = {lvl: i for i, lvl in enumerate(levels.ORDER)}


def _dec(x: float) -> Decimal:
    return Decimal(str(round(x, 2)))


def _placement_assessment(db: Session) -> Assessment:
    assessment = db.scalar(
        select(Assessment)
        .where(Assessment.type == AssessmentType.PLACEMENT, Assessment.is_published)
        .order_by(Assessment.version.desc())
    )
    if not assessment:
        raise AppError(404, "PLACEMENT_UNAVAILABLE", "Le test de niveau n'est pas disponible")
    return assessment


def _questions(db: Session, assessment_id: uuid.UUID) -> list[tuple[AssessmentQuestion, Activity]]:
    rows = db.execute(
        select(AssessmentQuestion, Activity)
        .join(Activity, AssessmentQuestion.activity_id == Activity.id)
        .where(AssessmentQuestion.assessment_id == assessment_id)
        .order_by(AssessmentQuestion.position)
    ).all()
    return [(q, a) for q, a in rows]


def _own_attempt(db: Session, user: User, attempt_id: uuid.UUID) -> AssessmentAttempt:
    attempt = db.scalar(
        select(AssessmentAttempt).where(
            AssessmentAttempt.id == attempt_id, AssessmentAttempt.student_id == user.id
        )
    )
    if not attempt:  # même réponse qu'une tentative inexistante : on ne révèle rien
        raise AppError(404, "ATTEMPT_NOT_FOUND", "Tentative introuvable")
    return attempt


def _saved_answers(db: Session, attempt_id: uuid.UUID) -> dict[uuid.UUID, AssessmentAnswer]:
    rows = db.scalars(select(AssessmentAnswer).where(AssessmentAnswer.attempt_id == attempt_id))
    return {r.question_id: r for r in rows}


def start(db: Session, user: User) -> dict:
    """Démarre un test, ou reprend celui en cours (jamais deux tentatives ouvertes)."""
    assessment = _placement_assessment(db)
    attempt = db.scalar(
        select(AssessmentAttempt).where(
            AssessmentAttempt.student_id == user.id,
            AssessmentAttempt.assessment_id == assessment.id,
            AssessmentAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    if not attempt:
        attempt = AssessmentAttempt(assessment_id=assessment.id, student_id=user.id)
        db.add(attempt)
        db.add(Event(user_id=user.id, event_name="placement_started", entity_type="assessment",
                     entity_id=assessment.id))
        db.commit()
        db.refresh(attempt)
    return _attempt_view(db, assessment, attempt)


def _attempt_view(db: Session, assessment: Assessment, attempt: AssessmentAttempt) -> dict:
    saved = _saved_answers(db, attempt.id)
    questions = [
        {
            "id": q.id,
            "position": q.position,
            "type": a.type,
            "config": grading.public_config(a.type, a.configuration, seed=str(a.id)),
        }
        for q, a in _questions(db, assessment.id)
    ]
    return {
        "attempt_id": attempt.id,
        "assessment": assessment,
        "questions": questions,
        "answers": {str(qid): ans.answer for qid, ans in saved.items()},
    }


def save_answer(db: Session, user: User, attempt_id: uuid.UUID, question_id: uuid.UUID, answer: Any) -> None:
    attempt = _own_attempt(db, user, attempt_id)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AppError(409, "ATTEMPT_CLOSED", "Ce test est déjà terminé")
    question = db.scalar(
        select(AssessmentQuestion).where(
            AssessmentQuestion.id == question_id, AssessmentQuestion.assessment_id == attempt.assessment_id
        )
    )
    if not question:
        raise AppError(404, "QUESTION_NOT_FOUND", "Question introuvable")
    existing = _saved_answers(db, attempt.id).get(question.id)
    if existing:
        existing.answer = answer  # on peut changer d'avis avant de terminer
    else:
        db.add(AssessmentAnswer(attempt_id=attempt.id, question_id=question.id, answer=answer))
    db.commit()


def complete(db: Session, user: User, attempt_id: uuid.UUID) -> dict:
    attempt = _own_attempt(db, user, attempt_id)
    if attempt.status == AttemptStatus.COMPLETED:
        return result_for(db, user, attempt)  # idempotent
    questions = _questions(db, attempt.assessment_id)
    saved = _saved_answers(db, attempt.id)
    missing = [q.position for q, _ in questions if q.id not in saved]
    if missing:
        raise AppError(409, "INCOMPLETE_ASSESSMENT", f"Il reste {len(missing)} question(s) sans réponse")

    now = datetime.now().astimezone()
    per_skill: dict[str, list[tuple[CefrLevel, bool]]] = {}
    pooled: list[tuple[CefrLevel, bool]] = []
    for q, activity in questions:
        cfg = activity.configuration or {}
        graded = grading.grade(activity.type, cfg, saved[q.id].answer)
        ok = bool(graded.is_correct)
        row = saved[q.id]
        row.is_correct = ok
        row.score = q.weight * activity.points if ok else Decimal(0)
        row.feedback = cfg.get("explanation")
        item = (CefrLevel(cfg["cefr"]), ok)
        per_skill.setdefault(cfg["skill"], []).append(item)
        pooled.append(item)

    overall_level = levels.estimate_level(pooled)
    attempt.score = _dec(levels.percentage(pooled))
    attempt.status = AttemptStatus.COMPLETED
    attempt.completed_at = now
    attempt.metadata_ = {"overall_level": overall_level.value, "questions": len(questions)}

    skills = {s.code: s for s in db.scalars(select(Skill).where(Skill.code.in_(per_skill)))}
    confidences = []
    for code, items in per_skill.items():
        skill = skills[code]
        lvl = levels.estimate_level(items)
        score = _dec(levels.percentage(items))
        confidence = Decimal(str(round(min(1.0, len(items) / 10), 3)))
        confidences.append(confidence)
        db.add(AssessmentSkillScore(attempt_id=attempt.id, skill_id=skill.id, score=score, level=lvl,
                                    confidence=confidence))
        _apply_skill_progress(db, user, skill, score, lvl, confidence, attempt.id, now)

    profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.student_id == user.id))
    if not profile:
        profile = StudentLearningProfile(student_id=user.id)
        db.add(profile)
    profile.current_level = overall_level
    profile.placement_attempt_id = attempt.id
    profile.confidence_score = _dec(sum(confidences) / len(confidences))

    db.add(Event(user_id=user.id, event_name="placement_completed", entity_type="assessment_attempt",
                 entity_id=attempt.id, properties={"level": overall_level.value}))
    db.commit()
    return result_for(db, user, attempt)


def _apply_skill_progress(db, user, skill, score, lvl, confidence, attempt_id, now) -> None:
    """Règle backend (jamais l'IA ni le client) : met à jour l'état courant ET l'historique."""
    current = db.scalar(
        select(StudentSkillProgress).where(
            StudentSkillProgress.student_id == user.id, StudentSkillProgress.skill_id == skill.id
        )
    )
    if not current:
        current = StudentSkillProgress(student_id=user.id, skill_id=skill.id, score=score)
        db.add(current)
    current.score, current.level, current.confidence, current.last_assessed_at = score, lvl, confidence, now
    db.add(SkillProgressHistory(student_id=user.id, skill_id=skill.id,
                                source_type=SkillSourceType.PLACEMENT_TEST, source_id=attempt_id,
                                score=score, level=lvl))


def recommended_program_slug(db: Session, lvl: CefrLevel) -> str | None:
    """Règle déterministe (MVP) : débutant -> English Start, sinon English Speaking."""
    slug = "english-start" if lvl == CefrLevel.A1 else "english-speaking"
    exists = db.scalar(select(Program.id).where(Program.slug == slug, Program.is_published))
    return slug if exists else None


def result_for(db: Session, user: User, attempt: AssessmentAttempt) -> dict:
    rows = db.execute(
        select(AssessmentSkillScore, Skill)
        .join(Skill, AssessmentSkillScore.skill_id == Skill.id)
        .where(AssessmentSkillScore.attempt_id == attempt.id)
    ).all()
    skills = sorted(
        (
            {"code": s.code, "name": s.name, "score": sc.score, "level": sc.level, "confidence": sc.confidence}
            for sc, s in rows
        ),
        key=lambda x: -x["score"],
    )
    overall = CefrLevel(attempt.metadata_["overall_level"])
    has_gap = len(skills) > 1 and skills[0]["score"] != skills[-1]["score"]
    return {
        "attempt_id": attempt.id,
        "completed_at": attempt.completed_at,
        "overall_level": overall,
        "overall_score": attempt.score,
        "skills": skills,
        # Pas de « point fort / à améliorer » s'il n'y a aucun écart entre les compétences.
        "strongest": skills[0]["code"] if has_gap else None,
        "weakest": skills[-1]["code"] if has_gap else None,
        "recommended_program_slug": recommended_program_slug(db, overall),
    }


def latest_result(db: Session, user: User) -> dict | None:
    attempt = db.scalar(
        select(AssessmentAttempt)
        .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
        .where(
            AssessmentAttempt.student_id == user.id,
            Assessment.type == AssessmentType.PLACEMENT,
            AssessmentAttempt.status == AttemptStatus.COMPLETED,
        )
        .order_by(AssessmentAttempt.completed_at.desc())
    )
    return result_for(db, user, attempt) if attempt else None


def result_by_id(db: Session, user: User, attempt_id: uuid.UUID) -> dict:
    attempt = _own_attempt(db, user, attempt_id)
    if attempt.status != AttemptStatus.COMPLETED:
        raise AppError(409, "ATTEMPT_NOT_COMPLETED", "Ce test n'est pas terminé")
    return result_for(db, user, attempt)
