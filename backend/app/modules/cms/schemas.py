import re
import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from app.modules.learning.models import ActivityType, ContentType, Difficulty

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _slug(value: str) -> str:
    if not SLUG_RE.match(value) or len(value) > 150:
        raise ValueError("Slug : lettres minuscules, chiffres et tirets uniquement (ex. mon-programme).")
    return value


Slug = Annotated[str, AfterValidator(_slug)]
Title = Annotated[str, Field(min_length=1, max_length=200)]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ----- entrées -----


class ProgramIn(BaseModel):
    name: Title
    slug: Slug | None = None
    description: str | None = Field(None, max_length=2000)
    difficulty: Difficulty
    duration_weeks: int | None = Field(None, ge=1, le=104)


class ProgramPatch(BaseModel):
    name: Title | None = None
    slug: Slug | None = None
    description: str | None = Field(None, max_length=2000)
    difficulty: Difficulty | None = None
    duration_weeks: int | None = Field(None, ge=1, le=104)


class CourseIn(BaseModel):
    title: Title
    slug: Slug | None = None
    description: str | None = Field(None, max_length=2000)
    difficulty: Difficulty
    estimated_minutes: int | None = Field(None, ge=1, le=10_000)


class CoursePatch(BaseModel):
    title: Title | None = None
    slug: Slug | None = None
    description: str | None = Field(None, max_length=2000)
    difficulty: Difficulty | None = None
    estimated_minutes: int | None = Field(None, ge=1, le=10_000)


class LessonIn(BaseModel):
    title: Title
    slug: Slug | None = None
    description: str | None = Field(None, max_length=2000)
    estimated_minutes: int | None = Field(None, ge=1, le=1_000)


class LessonPatch(BaseModel):
    title: Title | None = None
    slug: Slug | None = None
    description: str | None = Field(None, max_length=2000)
    estimated_minutes: int | None = Field(None, ge=1, le=1_000)


def _http_url(v: str | None) -> str | None:
    """Refuse javascript:, data: et tout schéma autre que http(s) (liens affichés aux élèves)."""
    if v and not re.match(r"^https?://[^\s]+$", v.strip(), re.IGNORECASE):
        raise ValueError("L'adresse doit commencer par http:// ou https://")
    return v.strip() if v else v


class ContentIn(BaseModel):
    type: ContentType
    title: str | None = Field(None, max_length=200)
    body: str | None = Field(None, max_length=10_000)
    url: str | None = Field(None, max_length=2000)

    _check_url = field_validator("url")(_http_url)


class ContentPatch(BaseModel):
    title: str | None = Field(None, max_length=200)
    body: str | None = Field(None, max_length=10_000)
    url: str | None = Field(None, max_length=2000)

    _check_url = field_validator("url")(_http_url)


class ActivityIn(BaseModel):
    type: ActivityType
    title: Title
    instructions: str | None = Field(None, max_length=1000)
    points: int = Field(1, ge=1, le=20)
    difficulty: Difficulty | None = None
    configuration: dict[str, Any]


class ActivityPatch(BaseModel):
    type: ActivityType | None = None
    title: Title | None = None
    instructions: str | None = Field(None, max_length=1000)
    points: int | None = Field(None, ge=1, le=20)
    difficulty: Difficulty | None = None
    configuration: dict[str, Any] | None = None


class ScenarioIn(BaseModel):
    title: Title
    slug: Slug | None = None
    description: str | None = Field(None, max_length=1000)
    context: str = Field(min_length=10, max_length=2000)  # la consigne EN que l'élève doit comprendre
    difficulty: Difficulty
    estimated_minutes: int | None = Field(None, ge=1, le=60)


class ScenarioPatch(BaseModel):
    title: Title | None = None
    slug: Slug | None = None
    description: str | None = Field(None, max_length=1000)
    context: str | None = Field(None, min_length=10, max_length=2000)
    difficulty: Difficulty | None = None
    estimated_minutes: int | None = Field(None, ge=1, le=60)


class Reorder(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=200)


# ----- sorties -----


class ProgramOut(ORM):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    difficulty: Difficulty
    duration_weeks: int | None
    status: str = "DRAFT"
    created_at: datetime
    updated_at: datetime


class ProgramListItem(BaseModel):
    program: ProgramOut
    course_count: int
    lesson_count: int
    enrolled_students: int


class LessonBrief(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    position: int
    status: str
    activity_count: int


class CourseOut(ORM):
    id: uuid.UUID
    program_id: uuid.UUID
    title: str
    slug: str
    description: str | None
    difficulty: Difficulty
    estimated_minutes: int | None
    position: int
    status: str = "DRAFT"


class CourseWithLessons(BaseModel):
    course: CourseOut
    lessons: list[LessonBrief]


class ProgramDetail(BaseModel):
    program: ProgramOut
    courses: list[CourseWithLessons]
    enrolled_students: int


class LessonOut(ORM):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    slug: str
    description: str | None
    estimated_minutes: int | None
    position: int
    status: str = "DRAFT"


class ContentOut(ORM):
    id: uuid.UUID
    type: ContentType
    title: str | None
    body: str | None
    url: str | None


class LessonContentItem(BaseModel):
    position: int
    content: ContentOut


class ActivityOut(ORM):
    id: uuid.UUID
    type: ActivityType
    title: str
    instructions: str | None
    position: int
    points: int
    difficulty: Difficulty | None
    configuration: dict[str, Any] | None
    attempts: int = 0


class LessonDetail(BaseModel):
    lesson: LessonOut
    program: dict[str, Any]
    course: dict[str, Any]
    contents: list[LessonContentItem]
    activities: list[ActivityOut]


class ScenarioOut(ORM):
    id: uuid.UUID
    title: str
    slug: str
    description: str | None
    context: str | None
    difficulty: Difficulty
    estimated_minutes: int | None
    is_published: bool
