import re
import unicodedata
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.cms import schemas as s
from app.modules.identity.models import User
from app.modules.learning.models import (
    Activity,
    ActivityAttempt,
    Content,
    ContentType,
    Course,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    LessonContent,
    Program,
    Skill,
)
from app.modules.learning.validation import ConfigInvalid, validate_activity
from app.modules.speaking.models import SpeakingScenario, SpeakingScenarioSkill
from app.seed_placement import BANK_SLUG
from app.seed_speaking import SKILL_WEIGHTS
from app.shared.audit import record_audit
from app.shared.errors import AppError

# ---------- utilitaires ----------


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:120] or "element"


def status_of(obj) -> str:
    if getattr(obj, "deleted_at", None):
        return "ARCHIVED"
    return "PUBLISHED" if obj.is_published else "DRAFT"


def _slug_for(db: Session, model, scope: list, requested: str | None, title: str, current_id=None) -> str:
    """Slug explicite : refusé s'il est pris (409). Sinon généré depuis le titre, suffixé si nécessaire."""
    def taken(slug: str) -> bool:
        q = select(model.id).where(model.slug == slug, *scope)
        if current_id:
            q = q.where(model.id != current_id)
        return db.scalar(q) is not None

    if requested:
        if taken(requested):
            raise AppError(409, "SLUG_TAKEN", f"Le slug « {requested} » est déjà utilisé")
        return requested
    base, slug, n = slugify(title), slugify(title), 2
    while taken(slug):
        slug, n = f"{base}-{n}", n + 1
    return slug


def _audit(db: Session, actor: User, entity: str, verb: str, obj, **new: Any) -> None:
    record_audit(db, actor, f"{entity.upper()}_{verb.upper()}", entity, obj.id, new=new or None)


def _next_position(db: Session, model, *scope) -> int:
    return (db.scalar(select(func.max(model.position)).where(*scope)) or 0) + 1


def _reorder(db: Session, siblings: list, ids: list[uuid.UUID]) -> None:
    if len(set(ids)) != len(ids) or set(ids) != {x.id for x in siblings}:
        raise AppError(422, "INVALID_ORDER", "La liste doit contenir exactement tous les éléments, une seule fois")
    by_id = {x.id: x for x in siblings}
    for i, id_ in enumerate(ids, start=1):
        by_id[id_].position = i


def _cannot_publish(reasons: list[str]) -> AppError:
    return AppError(422, "CANNOT_PUBLISH", "Publication impossible : éléments manquants ou invalides",
                    [{"field": "publish", "message": r} for r in reasons])


def _invalid_config(exc: ConfigInvalid) -> AppError:
    return AppError(422, "ACTIVITY_INVALID", "Exercice invalide",
                    [{"field": "configuration", "message": e} for e in exc.errors])


# ---------- accès ----------


def _program(db: Session, program_id: uuid.UUID) -> Program:
    p = db.scalar(select(Program).where(Program.id == program_id, Program.deleted_at.is_(None),
                                        Program.slug != BANK_SLUG))
    if not p:
        raise AppError(404, "PROGRAM_NOT_FOUND", "Programme introuvable")
    return p


def _course(db: Session, course_id: uuid.UUID) -> Course:
    c = db.scalar(select(Course).where(Course.id == course_id, Course.deleted_at.is_(None)))
    if not c:
        raise AppError(404, "COURSE_NOT_FOUND", "Cours introuvable")
    _program(db, c.program_id)  # le programme parent doit exister et ne pas être la banque système
    return c


def _lesson(db: Session, lesson_id: uuid.UUID) -> Lesson:
    ls = db.scalar(select(Lesson).where(Lesson.id == lesson_id, Lesson.deleted_at.is_(None)))
    if not ls:
        raise AppError(404, "LESSON_NOT_FOUND", "Leçon introuvable")
    _course(db, ls.course_id)
    return ls


def _activity(db: Session, activity_id: uuid.UUID) -> Activity:
    a = db.scalar(select(Activity).where(Activity.id == activity_id, Activity.deleted_at.is_(None)))
    if not a:
        raise AppError(404, "ACTIVITY_NOT_FOUND", "Exercice introuvable")
    _lesson(db, a.lesson_id)
    return a


def _active_activities(db: Session, lesson_id: uuid.UUID) -> list[Activity]:
    return list(db.scalars(select(Activity).where(Activity.lesson_id == lesson_id, Activity.deleted_at.is_(None))
                           .order_by(Activity.position)))


def _enrolled(db: Session, program_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(Enrollment).where(
        Enrollment.program_id == program_id,
        Enrollment.status.in_([EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]))) or 0


# ---------- programmes ----------


def _program_out(p: Program) -> dict:
    return {**{k: getattr(p, k) for k in ("id", "name", "slug", "description", "difficulty", "duration_weeks",
                                          "created_at", "updated_at")}, "status": status_of(p)}


def list_programs(db: Session) -> list[dict]:
    programs = db.scalars(select(Program).where(Program.deleted_at.is_(None), Program.slug != BANK_SLUG)
                          .order_by(Program.created_at))
    out = []
    for p in programs:
        courses = db.scalars(select(Course).where(Course.program_id == p.id, Course.deleted_at.is_(None))).all()
        lessons = db.scalar(select(func.count()).select_from(Lesson).where(
            Lesson.course_id.in_([c.id for c in courses] or [uuid.uuid4()]), Lesson.deleted_at.is_(None))) or 0
        out.append({"program": _program_out(p), "course_count": len(courses), "lesson_count": lessons,
                    "enrolled_students": _enrolled(db, p.id)})
    return out


def create_program(db: Session, actor: User, data: s.ProgramIn) -> dict:
    slug = _slug_for(db, Program, [], data.slug, data.name)
    p = Program(name=data.name.strip(), slug=slug, description=data.description, difficulty=data.difficulty,
                duration_weeks=data.duration_weeks, is_published=False)
    db.add(p)
    db.flush()
    _audit(db, actor, "program", "created", p, name=p.name)
    db.commit()
    return _program_out(p)


def get_program_detail(db: Session, program_id: uuid.UUID) -> dict:
    p = _program(db, program_id)
    courses = db.scalars(select(Course).where(Course.program_id == p.id, Course.deleted_at.is_(None))
                         .order_by(Course.position)).all()
    items = []
    for c in courses:
        lessons = db.scalars(select(Lesson).where(Lesson.course_id == c.id, Lesson.deleted_at.is_(None))
                             .order_by(Lesson.position)).all()
        counts = dict(db.execute(select(Activity.lesson_id, func.count()).where(
            Activity.lesson_id.in_([ls.id for ls in lessons] or [uuid.uuid4()]), Activity.deleted_at.is_(None))
            .group_by(Activity.lesson_id)).all())
        items.append({
            "course": {**{k: getattr(c, k) for k in ("id", "program_id", "title", "slug", "description",
                                                     "difficulty", "estimated_minutes", "position")},
                       "status": status_of(c)},
            "lessons": [{"id": ls.id, "title": ls.title, "slug": ls.slug, "position": ls.position,
                         "status": status_of(ls), "activity_count": counts.get(ls.id, 0)} for ls in lessons],
        })
    return {"program": _program_out(p), "courses": items, "enrolled_students": _enrolled(db, p.id)}


def update_program(db: Session, actor: User, program_id: uuid.UUID, data: s.ProgramPatch) -> dict:
    p = _program(db, program_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        changes["slug"] = _slug_for(db, Program, [], changes["slug"], p.name, current_id=p.id)
    for k, v in changes.items():
        setattr(p, k, v)
    _audit(db, actor, "program", "updated", p, fields=sorted(changes))
    db.commit()
    return _program_out(p)


def set_program_published(db: Session, actor: User, program_id: uuid.UUID, published: bool) -> dict:
    p = _program(db, program_id)
    if published:
        courses = db.scalars(select(Course).where(Course.program_id == p.id, Course.deleted_at.is_(None),
                                                  Course.is_published)).all()
        ok = any(db.scalar(select(func.count()).select_from(Lesson).where(
            Lesson.course_id == c.id, Lesson.deleted_at.is_(None), Lesson.is_published)) for c in courses)
        if not ok:
            raise _cannot_publish(["Publiez d'abord au moins un cours contenant au moins une leçon publiée."])
    p.is_published = published
    _audit(db, actor, "program", "published" if published else "unpublished", p)
    db.commit()
    return _program_out(p)


def archive_program(db: Session, actor: User, program_id: uuid.UUID) -> None:
    """Archivage (suppression logique) : l'historique des élèves est conservé (RB-09)."""
    p = _program(db, program_id)
    p.deleted_at, p.is_published = datetime.now(UTC), False
    _audit(db, actor, "program", "archived", p, enrolled_students=_enrolled(db, p.id))
    db.commit()


# ---------- cours ----------


def _course_out(c: Course) -> dict:
    return {**{k: getattr(c, k) for k in ("id", "program_id", "title", "slug", "description", "difficulty",
                                          "estimated_minutes", "position")}, "status": status_of(c)}


def create_course(db: Session, actor: User, program_id: uuid.UUID, data: s.CourseIn) -> dict:
    p = _program(db, program_id)
    slug = _slug_for(db, Course, [Course.program_id == p.id], data.slug, data.title)
    c = Course(program_id=p.id, title=data.title.strip(), slug=slug, description=data.description,
               difficulty=data.difficulty, estimated_minutes=data.estimated_minutes, is_published=False,
               position=_next_position(db, Course, Course.program_id == p.id, Course.deleted_at.is_(None)))
    db.add(c)
    db.flush()
    _audit(db, actor, "course", "created", c, title=c.title)
    db.commit()
    return _course_out(c)


def update_course(db: Session, actor: User, course_id: uuid.UUID, data: s.CoursePatch) -> dict:
    c = _course(db, course_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        changes["slug"] = _slug_for(db, Course, [Course.program_id == c.program_id], changes["slug"], c.title,
                                    current_id=c.id)
    for k, v in changes.items():
        setattr(c, k, v)
    _audit(db, actor, "course", "updated", c, fields=sorted(changes))
    db.commit()
    return _course_out(c)


def set_course_published(db: Session, actor: User, course_id: uuid.UUID, published: bool) -> dict:
    c = _course(db, course_id)
    if published and not db.scalar(select(func.count()).select_from(Lesson).where(
            Lesson.course_id == c.id, Lesson.deleted_at.is_(None), Lesson.is_published)):
        raise _cannot_publish(["Publiez d'abord au moins une leçon de ce cours."])
    c.is_published = published
    _audit(db, actor, "course", "published" if published else "unpublished", c)
    db.commit()
    return _course_out(c)


def archive_course(db: Session, actor: User, course_id: uuid.UUID) -> None:
    c = _course(db, course_id)
    c.deleted_at, c.is_published = datetime.now(UTC), False
    _audit(db, actor, "course", "archived", c)
    db.commit()


def reorder_courses(db: Session, actor: User, program_id: uuid.UUID, ids: list[uuid.UUID]) -> None:
    p = _program(db, program_id)
    _reorder(db, list(db.scalars(select(Course).where(Course.program_id == p.id, Course.deleted_at.is_(None)))), ids)
    record_audit(db, actor, "COURSES_REORDERED", "program", p.id)
    db.commit()


# ---------- leçons ----------


def _lesson_out(ls: Lesson) -> dict:
    return {**{k: getattr(ls, k) for k in ("id", "course_id", "title", "slug", "description",
                                           "estimated_minutes", "position")}, "status": status_of(ls)}


def create_lesson(db: Session, actor: User, course_id: uuid.UUID, data: s.LessonIn) -> dict:
    c = _course(db, course_id)
    slug = _slug_for(db, Lesson, [Lesson.course_id == c.id], data.slug, data.title)
    ls = Lesson(course_id=c.id, title=data.title.strip(), slug=slug, description=data.description,
                estimated_minutes=data.estimated_minutes, is_published=False,
                position=_next_position(db, Lesson, Lesson.course_id == c.id, Lesson.deleted_at.is_(None)))
    db.add(ls)
    db.flush()
    _audit(db, actor, "lesson", "created", ls, title=ls.title)
    db.commit()
    return _lesson_out(ls)


def get_lesson_detail(db: Session, lesson_id: uuid.UUID) -> dict:
    ls = _lesson(db, lesson_id)
    course = db.get(Course, ls.course_id)
    program = db.get(Program, course.program_id)
    contents = db.execute(select(Content, LessonContent.position).join(LessonContent, LessonContent.content_id == Content.id)
                          .where(LessonContent.lesson_id == ls.id).order_by(LessonContent.position)).all()
    acts = _active_activities(db, ls.id)
    attempts = dict(db.execute(select(ActivityAttempt.activity_id, func.count()).where(
        ActivityAttempt.activity_id.in_([a.id for a in acts] or [uuid.uuid4()]))
        .group_by(ActivityAttempt.activity_id)).all())
    return {
        "lesson": _lesson_out(ls),
        "program": {"id": program.id, "name": program.name},
        "course": {"id": course.id, "title": course.title},
        "contents": [{"position": pos, "content": c} for c, pos in contents],
        "activities": [{**{k: getattr(a, k) for k in ("id", "type", "title", "instructions", "position", "points",
                                                      "difficulty", "configuration")},
                        "attempts": attempts.get(a.id, 0)} for a in acts],
    }


def update_lesson(db: Session, actor: User, lesson_id: uuid.UUID, data: s.LessonPatch) -> dict:
    ls = _lesson(db, lesson_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        changes["slug"] = _slug_for(db, Lesson, [Lesson.course_id == ls.course_id], changes["slug"], ls.title,
                                    current_id=ls.id)
    for k, v in changes.items():
        setattr(ls, k, v)
    _audit(db, actor, "lesson", "updated", ls, fields=sorted(changes))
    db.commit()
    return _lesson_out(ls)


def set_lesson_published(db: Session, actor: User, lesson_id: uuid.UUID, published: bool) -> dict:
    ls = _lesson(db, lesson_id)
    if published:
        acts = _active_activities(db, ls.id)
        reasons = [] if acts else ["Ajoutez au moins un exercice avant de publier la leçon."]
        for a in acts:
            try:
                validate_activity(a.type, a.configuration)
            except ConfigInvalid as exc:
                reasons.append(f"Exercice « {a.title} » invalide : {'; '.join(exc.errors)}")
        if reasons:
            raise _cannot_publish(reasons)
    ls.is_published = published
    _audit(db, actor, "lesson", "published" if published else "unpublished", ls)
    db.commit()
    return _lesson_out(ls)


def archive_lesson(db: Session, actor: User, lesson_id: uuid.UUID) -> None:
    ls = _lesson(db, lesson_id)
    ls.deleted_at, ls.is_published = datetime.now(UTC), False
    _audit(db, actor, "lesson", "archived", ls)
    db.commit()


def reorder_lessons(db: Session, actor: User, course_id: uuid.UUID, ids: list[uuid.UUID]) -> None:
    c = _course(db, course_id)
    _reorder(db, list(db.scalars(select(Lesson).where(Lesson.course_id == c.id, Lesson.deleted_at.is_(None)))), ids)
    record_audit(db, actor, "LESSONS_REORDERED", "course", c.id)
    db.commit()


# ---------- contenus de leçon ----------


def _check_content(type_: ContentType, body: str | None, url: str | None) -> None:
    if type_ == ContentType.TEXT and not (body and body.strip()):
        raise AppError(422, "CONTENT_INVALID", "Un bloc de texte doit avoir un contenu",
                       [{"field": "body", "message": "Texte obligatoire."}])
    if type_ != ContentType.TEXT and not url:
        raise AppError(422, "CONTENT_INVALID", "Une adresse (URL) est obligatoire pour ce type de contenu",
                       [{"field": "url", "message": "Adresse obligatoire."}])


def add_content(db: Session, actor: User, lesson_id: uuid.UUID, data: s.ContentIn) -> dict:
    ls = _lesson(db, lesson_id)
    _check_content(data.type, data.body, data.url)
    content = Content(type=data.type, title=data.title, body=data.body, url=data.url)
    db.add(content)
    db.flush()
    pos = _next_position(db, LessonContent, LessonContent.lesson_id == ls.id)
    db.add(LessonContent(lesson_id=ls.id, content_id=content.id, position=pos))
    _audit(db, actor, "content", "created", content, lesson_id=str(ls.id))
    db.commit()
    return {"position": pos, "content": content}


def _content_for_lesson(db: Session, content_id: uuid.UUID) -> tuple[Content, LessonContent]:
    row = db.execute(select(Content, LessonContent).join(LessonContent, LessonContent.content_id == Content.id)
                     .where(Content.id == content_id)).first()
    if not row:
        raise AppError(404, "CONTENT_NOT_FOUND", "Contenu introuvable")
    _lesson(db, row[1].lesson_id)
    return row[0], row[1]


def update_content(db: Session, actor: User, content_id: uuid.UUID, data: s.ContentPatch) -> dict:
    content, link = _content_for_lesson(db, content_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(content, k, v)
    _check_content(content.type, content.body, content.url)
    _audit(db, actor, "content", "updated", content, fields=sorted(changes))
    db.commit()
    return {"position": link.position, "content": content}


def delete_content(db: Session, actor: User, content_id: uuid.UUID) -> None:
    """Suppression réelle : un contenu n'est référencé par aucune donnée d'élève."""
    content, link = _content_for_lesson(db, content_id)
    _audit(db, actor, "content", "deleted", content, lesson_id=str(link.lesson_id))
    db.delete(link)
    db.flush()  # le lien d'abord : la clé étrangère l'exige
    db.delete(content)
    db.commit()


def reorder_contents(db: Session, actor: User, lesson_id: uuid.UUID, ids: list[uuid.UUID]) -> None:
    ls = _lesson(db, lesson_id)
    links = list(db.scalars(select(LessonContent).where(LessonContent.lesson_id == ls.id)))
    if len(set(ids)) != len(ids) or set(ids) != {ln.content_id for ln in links}:
        raise AppError(422, "INVALID_ORDER", "La liste doit contenir exactement tous les contenus, une seule fois")
    by_content = {ln.content_id: ln for ln in links}
    for i, cid in enumerate(ids, start=1):
        by_content[cid].position = i
    record_audit(db, actor, "CONTENTS_REORDERED", "lesson", ls.id)
    db.commit()


# ---------- exercices ----------


def _activity_out(db: Session, a: Activity) -> dict:
    n = db.scalar(select(func.count()).select_from(ActivityAttempt).where(ActivityAttempt.activity_id == a.id)) or 0
    return {**{k: getattr(a, k) for k in ("id", "type", "title", "instructions", "position", "points",
                                          "difficulty", "configuration")}, "attempts": n}


def create_activity(db: Session, actor: User, lesson_id: uuid.UUID, data: s.ActivityIn) -> dict:
    ls = _lesson(db, lesson_id)
    try:
        config = validate_activity(data.type, data.configuration)
    except ConfigInvalid as exc:
        raise _invalid_config(exc) from None
    a = Activity(lesson_id=ls.id, type=data.type, title=data.title.strip(), instructions=data.instructions,
                 points=data.points, difficulty=data.difficulty, configuration=config,
                 position=_next_position(db, Activity, Activity.lesson_id == ls.id, Activity.deleted_at.is_(None)))
    db.add(a)
    db.flush()
    _audit(db, actor, "activity", "created", a, type=a.type.value, lesson_id=str(ls.id))
    db.commit()
    return _activity_out(db, a)


def update_activity(db: Session, actor: User, activity_id: uuid.UUID, data: s.ActivityPatch) -> dict:
    a = _activity(db, activity_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    new_type = changes.get("type", a.type)
    if new_type != a.type and _activity_out(db, a)["attempts"]:
        raise AppError(409, "ACTIVITY_HAS_ATTEMPTS",
                       "Ce type d'exercice ne peut plus changer : des élèves l'ont déjà tenté. Créez un nouvel exercice.")
    if "configuration" in changes or new_type != a.type:
        try:
            changes["configuration"] = validate_activity(new_type, changes.get("configuration", a.configuration))
        except ConfigInvalid as exc:
            raise _invalid_config(exc) from None
    for k, v in changes.items():
        setattr(a, k, v)
    _audit(db, actor, "activity", "updated", a, fields=sorted(changes))
    db.commit()
    return _activity_out(db, a)


def archive_activity(db: Session, actor: User, activity_id: uuid.UUID) -> None:
    a = _activity(db, activity_id)
    ls = db.get(Lesson, a.lesson_id)
    if ls.is_published and len(_active_activities(db, ls.id)) <= 1:
        raise AppError(409, "LAST_ACTIVITY", "Dépubliez la leçon avant de supprimer son dernier exercice.")
    a.deleted_at = datetime.now(UTC)  # les tentatives des élèves restent liées à l'exercice (historique)
    _audit(db, actor, "activity", "archived", a)
    db.commit()


def reorder_activities(db: Session, actor: User, lesson_id: uuid.UUID, ids: list[uuid.UUID]) -> None:
    ls = _lesson(db, lesson_id)
    _reorder(db, _active_activities(db, ls.id), ids)
    record_audit(db, actor, "ACTIVITIES_REORDERED", "lesson", ls.id)
    db.commit()


# ---------- situations d'oral ----------


def list_scenarios(db: Session) -> list[SpeakingScenario]:
    return list(db.scalars(select(SpeakingScenario).order_by(SpeakingScenario.created_at)))


def _scenario(db: Session, scenario_id: uuid.UUID) -> SpeakingScenario:
    sc = db.get(SpeakingScenario, scenario_id)
    if not sc:
        raise AppError(404, "SCENARIO_NOT_FOUND", "Situation introuvable")
    return sc


def create_scenario(db: Session, actor: User, data: s.ScenarioIn) -> SpeakingScenario:
    slug = _slug_for(db, SpeakingScenario, [], data.slug, data.title)
    sc = SpeakingScenario(title=data.title.strip(), slug=slug, description=data.description,
                          context=data.context.strip(), difficulty=data.difficulty,
                          estimated_minutes=data.estimated_minutes, is_published=False)
    db.add(sc)
    db.flush()
    for skill in db.scalars(select(Skill).where(Skill.code.in_(SKILL_WEIGHTS))):
        db.add(SpeakingScenarioSkill(scenario_id=sc.id, skill_id=skill.id, weight=SKILL_WEIGHTS[skill.code]))
    _audit(db, actor, "scenario", "created", sc, title=sc.title)
    db.commit()
    return sc


def update_scenario(db: Session, actor: User, scenario_id: uuid.UUID, data: s.ScenarioPatch) -> SpeakingScenario:
    sc = _scenario(db, scenario_id)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "slug" in changes:
        changes["slug"] = _slug_for(db, SpeakingScenario, [], changes["slug"], sc.title, current_id=sc.id)
    for k, v in changes.items():
        setattr(sc, k, v)
    _audit(db, actor, "scenario", "updated", sc, fields=sorted(changes))
    db.commit()
    return sc


def set_scenario_published(db: Session, actor: User, scenario_id: uuid.UUID, published: bool) -> SpeakingScenario:
    """Pas de suppression : des sessions d'élèves y sont rattachées. On dépublie."""
    sc = _scenario(db, scenario_id)
    sc.is_published = published
    _audit(db, actor, "scenario", "published" if published else "unpublished", sc)
    db.commit()
    return sc
