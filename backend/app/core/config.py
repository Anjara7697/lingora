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
    # Emails (récupération de mot de passe)
    email_backend: str = "console"  # "console" (développement : le message est écrit dans les logs) | "smtp"
    email_from: str = "Lingora <no-reply@lingora.local>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = True
    app_base_url: str = "http://localhost:3000"  # base des liens envoyés par email
    password_reset_minutes: int = 30
    # Limitation des tentatives (en mémoire, par processus ; Redis la partagera plus tard)
    rate_limit_enabled: bool = True
    trust_proxy_headers: bool = False  # True seulement derrière un reverse proxy de confiance (X-Forwarded-For)

    def validate_for_runtime(self) -> None:
        if self.environment == "production":
            if self.jwt_secret == DEFAULT_JWT_SECRET:
                raise RuntimeError("JWT_SECRET doit être défini en production")
            if self.email_backend == "console":
                # le backend console écrit les liens de réinitialisation dans les logs : jamais en production
                raise RuntimeError("EMAIL_BACKEND=smtp (avec SMTP_HOST) est obligatoire en production")
            if self.email_backend == "smtp" and not self.smtp_host:
                raise RuntimeError("SMTP_HOST doit être défini quand EMAIL_BACKEND=smtp")


settings = Settings()
