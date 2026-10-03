import uuid

from fastapi import APIRouter, Depends

from app.modules.cms import schemas as s
from app.modules.cms import service
from app.shared.dependencies import CurrentUser, DbSession, require_permission
from app.shared.errors import envelope

# Lecture et modification : « courses.update » ; création : « courses.create » (enseignants et admins).
Edit = Depends(require_permission("courses.update"))
Create = Depends(require_permission("courses.create"))
router = APIRouter(prefix="/cms", tags=["cms"], dependencies=[Edit])


def out(model, data, status_code: int | None = None):
    return envelope(model.model_validate(data).model_dump(mode="json"))


# ----- programmes -----


@router.get("/programs")
def programs(db: DbSession):
    return envelope([s.ProgramListItem.model_validate(i).model_dump(mode="json") for i in service.list_programs(db)])


@router.post("/programs", status_code=201, dependencies=[Create])
def create_program(body: s.ProgramIn, db: DbSession, actor: CurrentUser):
    return out(s.ProgramOut, service.create_program(db, actor, body))


@router.get("/programs/{program_id}")
def program(program_id: uuid.UUID, db: DbSession):
    return out(s.ProgramDetail, service.get_program_detail(db, program_id))


@router.patch("/programs/{program_id}")
def update_program(program_id: uuid.UUID, body: s.ProgramPatch, db: DbSession, actor: CurrentUser):
    return out(s.ProgramOut, service.update_program(db, actor, program_id, body))


@router.post("/programs/{program_id}/publish")
def publish_program(program_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.ProgramOut, service.set_program_published(db, actor, program_id, True))


@router.post("/programs/{program_id}/unpublish")
def unpublish_program(program_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.ProgramOut, service.set_program_published(db, actor, program_id, False))


@router.delete("/programs/{program_id}", status_code=204)
def archive_program(program_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    service.archive_program(db, actor, program_id)


@router.post("/programs/{program_id}/courses", status_code=201, dependencies=[Create])
def create_course(program_id: uuid.UUID, body: s.CourseIn, db: DbSession, actor: CurrentUser):
    return out(s.CourseOut, service.create_course(db, actor, program_id, body))


@router.post("/programs/{program_id}/courses/reorder", status_code=204)
def reorder_courses(program_id: uuid.UUID, body: s.Reorder, db: DbSession, actor: CurrentUser):
    service.reorder_courses(db, actor, program_id, body.ids)


# ----- cours -----


@router.patch("/courses/{course_id}")
def update_course(course_id: uuid.UUID, body: s.CoursePatch, db: DbSession, actor: CurrentUser):
    return out(s.CourseOut, service.update_course(db, actor, course_id, body))


@router.post("/courses/{course_id}/publish")
def publish_course(course_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.CourseOut, service.set_course_published(db, actor, course_id, True))


@router.post("/courses/{course_id}/unpublish")
def unpublish_course(course_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.CourseOut, service.set_course_published(db, actor, course_id, False))


@router.delete("/courses/{course_id}", status_code=204)
def archive_course(course_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    service.archive_course(db, actor, course_id)


@router.post("/courses/{course_id}/lessons", status_code=201, dependencies=[Create])
def create_lesson(course_id: uuid.UUID, body: s.LessonIn, db: DbSession, actor: CurrentUser):
    return out(s.LessonOut, service.create_lesson(db, actor, course_id, body))


@router.post("/courses/{course_id}/lessons/reorder", status_code=204)
def reorder_lessons(course_id: uuid.UUID, body: s.Reorder, db: DbSession, actor: CurrentUser):
    service.reorder_lessons(db, actor, course_id, body.ids)


# ----- leçons -----


@router.get("/lessons/{lesson_id}")
def lesson(lesson_id: uuid.UUID, db: DbSession):
    return out(s.LessonDetail, service.get_lesson_detail(db, lesson_id))


@router.patch("/lessons/{lesson_id}")
def update_lesson(lesson_id: uuid.UUID, body: s.LessonPatch, db: DbSession, actor: CurrentUser):
    return out(s.LessonOut, service.update_lesson(db, actor, lesson_id, body))


@router.post("/lessons/{lesson_id}/publish")
def publish_lesson(lesson_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.LessonOut, service.set_lesson_published(db, actor, lesson_id, True))


@router.post("/lessons/{lesson_id}/unpublish")
def unpublish_lesson(lesson_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.LessonOut, service.set_lesson_published(db, actor, lesson_id, False))


@router.delete("/lessons/{lesson_id}", status_code=204)
def archive_lesson(lesson_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    service.archive_lesson(db, actor, lesson_id)


@router.post("/lessons/{lesson_id}/contents", status_code=201, dependencies=[Create])
def add_content(lesson_id: uuid.UUID, body: s.ContentIn, db: DbSession, actor: CurrentUser):
    return out(s.LessonContentItem, service.add_content(db, actor, lesson_id, body))


@router.post("/lessons/{lesson_id}/contents/reorder", status_code=204)
def reorder_contents(lesson_id: uuid.UUID, body: s.Reorder, db: DbSession, actor: CurrentUser):
    service.reorder_contents(db, actor, lesson_id, body.ids)


@router.post("/lessons/{lesson_id}/activities", status_code=201, dependencies=[Create])
def create_activity(lesson_id: uuid.UUID, body: s.ActivityIn, db: DbSession, actor: CurrentUser):
    return out(s.ActivityOut, service.create_activity(db, actor, lesson_id, body))


@router.post("/lessons/{lesson_id}/activities/reorder", status_code=204)
def reorder_activities(lesson_id: uuid.UUID, body: s.Reorder, db: DbSession, actor: CurrentUser):
    service.reorder_activities(db, actor, lesson_id, body.ids)


# ----- contenus & exercices -----


@router.patch("/contents/{content_id}")
def update_content(content_id: uuid.UUID, body: s.ContentPatch, db: DbSession, actor: CurrentUser):
    return out(s.LessonContentItem, service.update_content(db, actor, content_id, body))


@router.delete("/contents/{content_id}", status_code=204)
def delete_content(content_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    service.delete_content(db, actor, content_id)


@router.patch("/activities/{activity_id}")
def update_activity(activity_id: uuid.UUID, body: s.ActivityPatch, db: DbSession, actor: CurrentUser):
    return out(s.ActivityOut, service.update_activity(db, actor, activity_id, body))


@router.delete("/activities/{activity_id}", status_code=204)
def archive_activity(activity_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    service.archive_activity(db, actor, activity_id)


# ----- situations d'oral -----


@router.get("/scenarios")
def scenarios(db: DbSession):
    return envelope([s.ScenarioOut.model_validate(x).model_dump(mode="json") for x in service.list_scenarios(db)])


@router.post("/scenarios", status_code=201, dependencies=[Create])
def create_scenario(body: s.ScenarioIn, db: DbSession, actor: CurrentUser):
    return out(s.ScenarioOut, service.create_scenario(db, actor, body))


@router.patch("/scenarios/{scenario_id}")
def update_scenario(scenario_id: uuid.UUID, body: s.ScenarioPatch, db: DbSession, actor: CurrentUser):
    return out(s.ScenarioOut, service.update_scenario(db, actor, scenario_id, body))


@router.post("/scenarios/{scenario_id}/publish")
def publish_scenario(scenario_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.ScenarioOut, service.set_scenario_published(db, actor, scenario_id, True))


@router.post("/scenarios/{scenario_id}/unpublish")
def unpublish_scenario(scenario_id: uuid.UUID, db: DbSession, actor: CurrentUser):
    return out(s.ScenarioOut, service.set_scenario_published(db, actor, scenario_id, False))
