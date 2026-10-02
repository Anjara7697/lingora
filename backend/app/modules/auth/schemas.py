import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field, model_validator

from app.modules.users.schemas import UserOut


def _strong_password(value: str) -> str:
    if not (re.search(r"[A-Za-z]", value) and re.search(r"\d", value)):
        raise ValueError("Le mot de passe doit contenir au moins une lettre et un chiffre")
    return value


Password = Annotated[str, Field(min_length=8, max_length=128), AfterValidator(_strong_password)]


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: Password
    password_confirmation: str

    @model_validator(mode="after")
    def _passwords_match(self):
        if self.password != self.password_confirmation:
            raise ValueError("La confirmation ne correspond pas au mot de passe")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: Password


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthOut(BaseModel):
    user: UserOut
    tokens: TokenPair
