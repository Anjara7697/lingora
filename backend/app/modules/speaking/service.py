import time
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_token
from app.integrations.ai import (
    AIProviderError,
    TranscriptRequired,
    get_analyzer,
    get_stt,
    normalize,
)
from app.integrations.storage import get_storage
from app.modules.identity.models import User
from app.modules.learning.models import Skill
from app.modules.platform.models import Event
from app.modules.progress.models import SkillProgressHistory, SkillSourceType, StudentSkillProgress
from app.modules.speaking.models import (
    AiAnalysis,
    MediaFile,
    SessionStatus,
    Speaker,
    SpeakingFeedback,
    SpeakingMode,
    SpeakingScenario,
    SpeakingSession,
    SpeakingTurn,
    SpeechTranscription,
)
from app.shared.errors import AppError

ALLOWED_MIME = {
    "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3",
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/aac": "aac",
}
# Compétences mises à jour par une session (règle backend ; le niveau CECRL n'est pas modifié ici)
DIMENSION_TO_SKILL = {"grammar": "GRAMMAR", "vocabulary": "VOCABULARY", "fluency": "FLUENCY"}
SMOOTHING_OLD = Decimal("0.7")  # une session ne doit pas faire basculer un score à elle seule


# ---------- Scénarios ----------


def list_scenarios(db: Session) -> list[SpeakingScenario]:
    return list(
        db.scalars(
            select(SpeakingScenario).where(SpeakingScenario.is_published).order_by(
                SpeakingScenario.estimated_minutes, SpeakingScenario.title
            )
        )
    )


def _published_scenario(db: Session, scenario_id: uuid.UUID) -> SpeakingScenario:
    scenario = db.scalar(
        select(SpeakingScenario).where(SpeakingScenario.id == scenario_id, SpeakingScenario.is_published)
    )
    if not scenario:
        raise AppError(404, "SCENARIO_NOT_FOUND", "Scénario introuvable")
    return scenario


# ---------- Sessions ----------


def create_session(db: Session, user: User, scenario_id: uuid.UUID) -> SpeakingSession:
    scenario = _published_scenario(db, scenario_id)
    existing = db.scalar(
        select(SpeakingSession).where(
            SpeakingSession.student_id == user.id,
            SpeakingSession.scenario_id == scenario.id,
            SpeakingSession.status == SessionStatus.IN_PROGRESS,
        )
    )
    if existing:  # on reprend la session ouverte plutôt que d'en empiler
        return existing
    session = SpeakingSession(student_id=user.id, scenario_id=scenario.id, mode=SpeakingMode.PRACTICE)
    db.add(session)
    db.add(Event(user_id=user.id, event_name="speaking_started", entity_type="speaking_scenario",
                 entity_id=scenario.id))
    db.commit()
    db.refresh(session)
    return session


def _own_session(db: Session, user: User, session_id: uuid.UUID) -> SpeakingSession:
    session = db.scalar(
        select(SpeakingSession).where(SpeakingSession.id == session_id, SpeakingSession.student_id == user.id)
    )
    if not session:
        raise AppError(404, "SESSION_NOT_FOUND", "Session introuvable")
    return session


def attempts_today(db: Session, user: User) -> int:
    start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return db.scalar(
        select(func.count())
        .select_from(SpeakingTurn)
        .join(SpeakingSession, SpeakingTurn.session_id == SpeakingSession.id)
        .where(
            SpeakingSession.student_id == user.id,
            SpeakingTurn.speaker == Speaker.STUDENT,
            SpeakingTurn.created_at >= start,
        )
    )


def _media_url(media_id: uuid.UUID | None) -> str | None:
    if not media_id:
        return None
    return f"/api/v1/speaking/media/{media_id}?token={create_token(str(media_id), 'media')}"


def _turn_view(turn: SpeakingTurn, analysis: AiAnalysis | None, transcription: SpeechTranscription | None) -> dict:
    return {
        "id": turn.id,
        "sequence_number": turn.sequence_number,
        "transcript": turn.text,
        "transcript_simulated": bool(transcription and (transcription.raw_response or {}).get("source") == "client-hint"),
        "audio_url": _media_url(turn.audio_file_id),
        "overall_score": float(analysis.score) if analysis and analysis.score is not None else None,
        "analysis": analysis.result if analysis else None,
        "created_at": turn.created_at,
    }


def _turns(db: Session, session_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        select(SpeakingTurn, AiAnalysis, SpeechTranscription)
        .outerjoin(AiAnalysis, AiAnalysis.speaking_turn_id == SpeakingTurn.id)
        .outerjoin(SpeechTranscription, SpeechTranscription.media_file_id == SpeakingTurn.audio_file_id)
        .where(SpeakingTurn.session_id == session_id, SpeakingTurn.speaker == Speaker.STUDENT)
        .order_by(SpeakingTurn.sequence_number)
    ).all()
    return [_turn_view(t, a, tr) for t, a, tr in rows]


def get_session_detail(db: Session, user: User, session_id: uuid.UUID) -> dict:
    session = _own_session(db, user, session_id)
    scenario = db.get(SpeakingScenario, session.scenario_id)
    turns = _turns(db, session.id)
    feedback = db.scalar(select(SpeakingFeedback).where(SpeakingFeedback.session_id == session.id))
    return {
        "session": session,
        "scenario": scenario,
        "turns": turns,
        "feedback": _feedback_view(feedback, turns) if feedback else None,
        "attempts_left_today": max(0, settings.speaking_daily_limit - attempts_today(db, user)),
    }


# ---------- Tentative (un « tour » étudiant) ----------


def submit_turn(
    db: Session,
    user: User,
    session_id: uuid.UUID,
    audio: bytes,
    mime_type: str,
    duration_seconds: float,
    transcript_hint: str | None,
) -> dict:
    session = _own_session(db, user, session_id)
    if session.status != SessionStatus.IN_PROGRESS:
        raise AppError(409, "SESSION_CLOSED", "Cette session est terminée")

    base_mime = mime_type.split(";")[0].strip().lower()
    if base_mime not in ALLOWED_MIME:
        raise AppError(415, "UNSUPPORTED_AUDIO", "Format audio non pris en charge")
    if not audio:
        raise AppError(422, "EMPTY_AUDIO", "Enregistrement vide")
    if len(audio) > settings.max_audio_bytes:
        raise AppError(413, "AUDIO_TOO_LARGE", "Enregistrement trop volumineux")
    if not 0 < duration_seconds <= settings.max_audio_seconds:
        raise AppError(422, "INVALID_DURATION", f"Durée invalide (maximum {settings.max_audio_seconds} s)")
    if attempts_today(db, user) >= settings.speaking_daily_limit:
        raise AppError(429, "DAILY_LIMIT_REACHED", "Limite quotidienne d'analyses atteinte, revenez demain")

    scenario = db.get(SpeakingScenario, session.scenario_id)
    scenario_text = f"{scenario.title}. {scenario.context or ''}"
    stt, analyzer = get_stt(), get_analyzer()
    started = time.perf_counter()
    try:
        transcript = stt.transcribe(audio, base_mime, hint_text=transcript_hint)
        raw = analyzer.analyze(transcript.text, scenario_text=scenario_text, duration_seconds=duration_seconds)
        result = normalize(raw)  # sortie brute -> validation -> feedback normalisé
    except TranscriptRequired:
        raise AppError(422, "TRANSCRIPT_REQUIRED", "Ajoutez la transcription de votre réponse (mode démo)") from None
    except AIProviderError:
        raise AppError(503, "AI_UNAVAILABLE", "L'analyse est momentanément indisponible, réessayez.") from None
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    storage = get_storage()
    now = datetime.now(UTC)
    key = f"speaking/{now:%Y/%m}/{uuid.uuid4()}.{ALLOWED_MIME[base_mime]}"
    storage.put(key, audio)
    try:
        media = MediaFile(storage_provider=storage.provider, storage_key=key, mime_type=base_mime,
                          size_bytes=len(audio), duration_seconds=Decimal(str(round(duration_seconds, 2))))
        db.add(media)
        db.flush()
        last = db.scalar(select(func.max(SpeakingTurn.sequence_number)).where(SpeakingTurn.session_id == session.id))
        turn = SpeakingTurn(session_id=session.id, sequence_number=(last or 0) + 1, speaker=Speaker.STUDENT,
                            text=transcript.text, audio_file_id=media.id)
        db.add(turn)
        db.flush()
        transcription = SpeechTranscription(
            media_file_id=media.id, provider=stt.name, model=transcript.model, language=transcript.language,
            text=transcript.text, confidence=transcript.confidence, processing_time_ms=elapsed_ms,
            raw_response=transcript.raw,
        )
        db.add(transcription)
        analysis = AiAnalysis(
            speaking_turn_id=turn.id, provider=analyzer.name, model=analyzer.model,
            analysis_type="SPEAKING_FEEDBACK",
            score=Decimal(str(result.overall_score)) if result.overall_score is not None else None,
            result=result.model_dump(mode="json"), raw_response=raw,
        )
        db.add(analysis)
        db.add(Event(user_id=user.id, event_name="ai_usage", entity_type="speaking_turn", entity_id=turn.id,
                     properties={"provider": analyzer.name, "model": analyzer.model,
                                 "audio_seconds": duration_seconds, "cost_estimate_usd": 0.0}))
        db.commit()
    except Exception:
        db.rollback()
        storage.delete(key)  # pas de fichier orphelin si la base refuse
        raise
    db.refresh(turn)
    return _turn_view(turn, analysis, transcription)


# ---------- Fin de session ----------


def _feedback_view(feedback: SpeakingFeedback, turns: list[dict]) -> dict:
    scores = [t["overall_score"] for t in turns if t["overall_score"] is not None]
    return {
        "overall_score": feedback.overall_score,
        "strengths": (feedback.strengths or {}).get("items", []),
        "improvements": (feedback.weaknesses or {}).get("items", []),
        "recommendations": (feedback.recommendations or {}).get("items", []),
        "first_attempt_score": scores[0] if scores else None,
        "last_attempt_score": scores[-1] if scores else None,
        "attempts": len(turns),
    }


def complete_session(db: Session, user: User, session_id: uuid.UUID) -> dict:
    session = _own_session(db, user, session_id)
    if session.status == SessionStatus.COMPLETED:
        return get_session_detail(db, user, session_id)  # idempotent
    rows = db.execute(
        select(SpeakingTurn, AiAnalysis)
        .join(AiAnalysis, AiAnalysis.speaking_turn_id == SpeakingTurn.id)
        .where(SpeakingTurn.session_id == session.id)
        .order_by(SpeakingTurn.sequence_number)
    ).all()
    if not rows:
        raise AppError(409, "NO_ATTEMPTS", "Faites au moins une tentative avant de terminer")

    last = normalize(rows[-1][1].result)  # on évalue la DERNIÈRE tentative : c'est la meilleure mesure du progrès
    improvements = [
        {"kind": i.kind, "original": i.original, "suggestion": i.suggestion, "explanation": i.explanation}
        for dim in last.dimensions().values() for i in dim.issues
    ]
    now = datetime.now(UTC)
    db.add(SpeakingFeedback(
        session_id=session.id,
        overall_score=Decimal(str(last.overall_score)) if last.overall_score is not None else None,
        strengths={"items": last.strengths}, weaknesses={"items": improvements},
        recommendations={"items": last.tips}, generated_by="AI",
    ))
    session.status = SessionStatus.COMPLETED
    session.completed_at = now
    _apply_skill_progress(db, user, session, last, now)
    db.add(Event(user_id=user.id, event_name="speaking_completed", entity_type="speaking_session",
                 entity_id=session.id, properties={"attempts": len(rows), "score": last.overall_score}))
    db.commit()
    return get_session_detail(db, user, session_id)


def _apply_skill_progress(db: Session, user: User, session: SpeakingSession, result, now: datetime) -> None:
    """Règle backend : l'IA produit une analyse, c'est ce code qui décide de la progression (RB-06)."""
    scores = {DIMENSION_TO_SKILL[k]: d.score for k, d in result.dimensions().items()
              if k in DIMENSION_TO_SKILL and d.score is not None}
    if result.overall_score is not None:
        scores["SPEAKING"] = result.overall_score
    skills = {s.code: s for s in db.scalars(select(Skill).where(Skill.code.in_(scores)))}
    for code, score in scores.items():
        skill = skills.get(code)
        if not skill:
            continue
        new = Decimal(str(round(score, 2)))
        current = db.scalar(select(StudentSkillProgress).where(
            StudentSkillProgress.student_id == user.id, StudentSkillProgress.skill_id == skill.id))
        if current:
            current.score = (current.score * SMOOTHING_OLD + new * (1 - SMOOTHING_OLD)).quantize(Decimal("0.01"))
            current.last_assessed_at = now
            stored = current.score
        else:
            db.add(StudentSkillProgress(student_id=user.id, skill_id=skill.id, score=new,
                                        confidence=Decimal("0.2"), last_assessed_at=now))
            stored = new
        db.add(SkillProgressHistory(student_id=user.id, skill_id=skill.id, source_type=SkillSourceType.SPEAKING,
                                    source_id=session.id, score=stored))


# ---------- Média (URL signée) ----------


def load_media(db: Session, media_id: uuid.UUID) -> tuple[bytes, str]:
    media = db.scalar(select(MediaFile).where(MediaFile.id == media_id, MediaFile.deleted_at.is_(None)))
    if not media:
        raise AppError(404, "MEDIA_NOT_FOUND", "Fichier introuvable")
    try:
        return get_storage().get(media.storage_key), media.mime_type
    except FileNotFoundError:
        raise AppError(404, "MEDIA_NOT_FOUND", "Fichier introuvable") from None
