from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Lingora API"
    database_url: str = "postgresql+psycopg://lingora:lingora@localhost:5432/lingora"
    jwt_secret: str = "change-me"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
