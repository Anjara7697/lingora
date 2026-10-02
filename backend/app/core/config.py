from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "dev-only-insecure-secret-change-me-please"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Lingora API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://lingora:lingora@localhost:5432/lingora"
    jwt_secret: str = DEFAULT_JWT_SECRET
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    cors_origins: str = "http://localhost:3000"
    # Speaking Lab
    storage_dir: str = "./storage_data"
    max_audio_bytes: int = 10 * 1024 * 1024
    max_audio_seconds: int = 180
    media_token_minutes: int = 5
    ai_provider: str = "demo"
    speaking_daily_limit: int = 20  # tentatives d'analyse IA par utilisateur et par jour

    def validate_for_runtime(self) -> None:
        if self.environment == "production" and self.jwt_secret == DEFAULT_JWT_SECRET:
            raise RuntimeError("JWT_SECRET doit être défini en production")


settings = Settings()
