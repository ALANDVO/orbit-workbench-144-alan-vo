import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_NAME: str = "orbit-workbench-144-alan-vo"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/orbit.db"

    # Security
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OIDC / Keycloak
    OIDC_ISSUER_URL: str = ""
    OIDC_CLIENT_ID: str = ""
    OIDC_CLIENT_SECRET: str = ""
    OIDC_REDIRECT_URI: str = ""
    OIDC_SCOPES: str = "openid profile email roles"

    # LLM
    LLM_API_KEY: str = ""
    LLM_PROVIDER: str = "openai-compatible"
    LLM_MODEL: str = ""
    LLM_BASE_URL: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def oidc_scopes_list(self) -> list[str]:
        return [s.strip() for s in self.OIDC_SCOPES.split() if s.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()