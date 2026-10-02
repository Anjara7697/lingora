import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.identity.models import UserRole, UserStatus


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    avatar_url: str | None = None
    birth_date: date | None = None
    country: str | None = None
    city: str | None = None
    native_language: str | None = None
    timezone: str | None = None
    bio: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    role: UserRole
    status: UserStatus
    created_at: datetime
    profile: ProfileOut | None = None

    @classmethod
    def from_user(cls, user) -> "UserOut":
        return cls.model_validate(user)


class ProfileUpdate(BaseModel):
    avatar_url: str | None = None
    birth_date: date | None = None
    country: str | None = Field(None, max_length=100)
    city: str | None = Field(None, max_length=100)
    native_language: str | None = Field(None, max_length=50)
    timezone: str | None = Field(None, max_length=64)
    bio: str | None = None


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=30)
    profile: ProfileUpdate | None = None
