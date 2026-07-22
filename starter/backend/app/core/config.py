from __future__ import annotations

from os import environ


class Settings:
    app_env: str = environ.get("APP_ENV", "development")
    app_name: str = environ.get("APP_NAME", "HiTrendy")
    api_prefix: str = environ.get("API_PREFIX", "/api/v1")
    database_url: str = environ.get("DATABASE_URL", "sqlite:///./hitrendy.db")
    redis_url: str = environ.get("REDIS_URL", "")
    object_storage_endpoint: str = environ.get("OBJECT_STORAGE_ENDPOINT", "")
    object_storage_access_key: str = environ.get("OBJECT_STORAGE_ACCESS_KEY", "")
    object_storage_secret_key: str = environ.get("OBJECT_STORAGE_SECRET_KEY", "")
    object_storage_bucket: str = environ.get("OBJECT_STORAGE_BUCKET", "hitrendy")
    object_storage_provider: str = environ.get("OBJECT_STORAGE_PROVIDER", "local")
    object_storage_local_dir: str = environ.get("OBJECT_STORAGE_LOCAL_DIR", "./storage")
    ai_provider: str = environ.get("AI_PROVIDER", "demo")
    ai_model: str = environ.get("AI_MODEL", "demo-v1")
    ai_base_url: str = environ.get("AI_BASE_URL", "")
    ai_api_key: str = environ.get("AI_API_KEY", "")
    ai_timeout_seconds: float = float(environ.get("AI_TIMEOUT_SECONDS", "30"))
    vision_provider: str = environ.get("VISION_PROVIDER", "demo")
    vision_model: str = environ.get("VISION_MODEL", "demo-vision-v1")
    vision_base_url: str = environ.get("VISION_BASE_URL", "")
    vision_api_key: str = environ.get("VISION_API_KEY", "")
    jwt_secret: str = environ.get("JWT_SECRET", "replace-in-local-env")
    session_cookie_name: str = environ.get("SESSION_COOKIE_NAME", "hitrendy_session")
    session_ttl_hours: int = int(environ.get("SESSION_TTL_HOURS", "168"))
    allowed_origins: str = environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
    max_upload_mb: int = int(environ.get("MAX_UPLOAD_MB", "10"))
    max_upload_pixels: int = int(environ.get("MAX_UPLOAD_PIXELS", "25_000_000"))
    max_upload_expansion_ratio: int = int(environ.get("MAX_UPLOAD_EXPANSION_RATIO", "200"))
    max_request_body_bytes: int = int(environ.get("MAX_REQUEST_BODY_BYTES", "12_000_000"))
    rate_limit_requests: int = int(environ.get("RATE_LIMIT_REQUESTS", "20"))
    rate_limit_window_seconds: int = int(environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))

    @property
    def is_demo(self) -> bool:
        return self.app_env == "development" and self.ai_provider == "demo"

    def validate_runtime_configuration(self) -> None:
        """Reject production defaults before the API accepts private traffic."""

        if self.app_env != "production":
            return

        invalid = (
            self.jwt_secret == "replace-in-local-env"
            or self.object_storage_provider != "s3"
            or not all(
                [
                    self.object_storage_endpoint,
                    self.object_storage_access_key,
                    self.object_storage_secret_key,
                    self.object_storage_bucket,
                ]
            )
            or self.ai_provider == "demo"
            or self.vision_provider == "demo"
            or not self.redis_url
            or not self.allowed_origins
            or any(
                not origin.strip().startswith("https://")
                for origin in self.allowed_origins.split(",")
            )
        )
        if invalid:
            raise RuntimeError("La configuración de producción no es segura.")


settings = Settings()
