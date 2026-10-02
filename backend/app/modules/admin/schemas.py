import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.auth.schemas import Password
from app.modules.identity.models import UserRole, UserStatus


class AdminUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login_at: datetime | None


class UserPage(BaseModel):
    items: list[AdminUser]
    total: int


class CreateUser(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    role: UserRole
    password: Password


class UpdateUser(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    role: UserRole | None = None
    # DELETED n'est pas modifiable ici : on suspend ou on réactive.
    status: Annotated[UserStatus, Field(description="ACTIVE ou SUSPENDED")] | None = None


class ResetPassword(BaseModel):
    password: Password


class TeacherItem(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    student_count: int


class StudentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr


class Roster(BaseModel):
    teacher: TeacherItem
    assigned: list[StudentItem]
    available: list[StudentItem]


class AssignStudents(BaseModel):
    student_ids: list[uuid.UUID] = Field(min_length=1, max_length=200)
