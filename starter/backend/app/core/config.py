from __future__ import annotations

from collections.abc import Mapping
from os import environ
from urllib.parse import urlparse


def _as_bool(value: str, *, name: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise RuntimeError(f"{name} debe ser true o false.")


def _positive_int(value: str, *, name: str, minimum: int = 1) -> int:
    try:
        parsed = int(value.replace("_", ""))
    except ValueError as exc:
        raise RuntimeError(f"{name} debe ser un entero válido.") from exc
    if parsed < minimum:
        raise RuntimeError(f"{name} debe ser mayor o igual que {minimum}.")
    return parsed


def _non_negative_int(value: str, *, name: str, maximum: int) -> int:
    try:
        parsed = int(value.replace("_", ""))
    except ValueError as exc:
        raise RuntimeError(f"{name} debe ser un entero válido.") from exc
    if parsed < 0 or parsed > maximum:
        raise RuntimeError(f"{name} debe estar entre 0 y {maximum}.")
    return parsed


def _positive_float(value: str, *, name: str) -> float:
    try:
        parsed = float(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} debe ser un número válido.") from exc
    if parsed <= 0:
        raise RuntimeError(f"{name} debe ser mayor que cero.")
    return parsed


def _validate_http_url(value: str, *, name: str, require_https: bool) -> None:
    parsed = urlparse(value)
    allowed_schemes = {"https"} if require_https else {"http", "https"}
    if parsed.scheme not in allowed_schemes or not parsed.netloc:
        protocol = "https" if require_https else "http o https"
        raise RuntimeError(f"{name} debe ser una URL válida con {protocol}.")


class Settings:
    def __init__(self, source: Mapping[str, str] | None = None) -> None:
        values = environ if source is None else source

        self.app_env: str = values.get("APP_ENV", "development").strip().lower()
        self.app_name: str = values.get("APP_NAME", "HiTrendy").strip() or "HiTrendy"
        self.api_prefix: str = values.get("API_PREFIX", "/api/v1").strip() or "/api/v1"

        self.database_url: str = values.get("DATABASE_URL", "sqlite:///./hitrendy.db").strip()
        self.redis_url: str = values.get("REDIS_URL", "").strip()

        self.object_storage_endpoint: str = values.get("OBJECT_STORAGE_ENDPOINT", "").strip()
        self.object_storage_access_key: str = values.get("OBJECT_STORAGE_ACCESS_KEY", "").strip()
        self.object_storage_secret_key: str = values.get("OBJECT_STORAGE_SECRET_KEY", "").strip()
        self.object_storage_bucket: str = values.get("OBJECT_STORAGE_BUCKET", "hitrendy").strip()
        self.object_storage_provider: str = (
            values.get("OBJECT_STORAGE_PROVIDER", "local").strip().lower()
        )
        self.object_storage_local_dir: str = values.get(
            "OBJECT_STORAGE_LOCAL_DIR", "./storage"
        ).strip()

        self.ai_provider: str = values.get("AI_PROVIDER", "demo").strip().lower()
        self.ai_model: str = values.get("AI_MODEL", "demo-v1").strip()
        self.ai_base_url: str = values.get("AI_BASE_URL", "").strip().rstrip("/")
        self.ai_api_key: str = values.get("AI_API_KEY", "").strip()
        self.ai_timeout_seconds: float = _positive_float(
            values.get("AI_TIMEOUT_SECONDS", "30"),
            name="AI_TIMEOUT_SECONDS",
        )
        self.ai_max_retries: int = _non_negative_int(
            values.get("AI_MAX_RETRIES", "1"),
            name="AI_MAX_RETRIES",
            maximum=2,
        )
        self.ai_retry_base_seconds: float = _positive_float(
            values.get("AI_RETRY_BASE_SECONDS", "0.5"),
            name="AI_RETRY_BASE_SECONDS",
        )
        self.ai_http_referer: str = values.get("AI_HTTP_REFERER", "").strip()
        self.ai_app_title: str = values.get("AI_APP_TITLE", "HiTrendy").strip() or "HiTrendy"

        self.vision_provider: str = values.get("VISION_PROVIDER", "demo").strip().lower()
        self.vision_model: str = values.get("VISION_MODEL", "demo-vision-v1").strip()
        self.vision_base_url: str = values.get("VISION_BASE_URL", "").strip().rstrip("/")
        self.vision_api_key: str = values.get("VISION_API_KEY", "").strip()

        self.jwt_secret: str = values.get("JWT_SECRET", "replace-in-local-env").strip()
        self.session_cookie_name: str = values.get(
            "SESSION_COOKIE_NAME", "hitrendy_session"
        ).strip()
        self.session_ttl_hours: int = _positive_int(
            values.get("SESSION_TTL_HOURS", "168"),
            name="SESSION_TTL_HOURS",
        )
        self.allowed_origins: str = values.get("ALLOWED_ORIGINS", "http://localhost:3000").strip()

        self.max_upload_mb: int = _positive_int(
            values.get("MAX_UPLOAD_MB", "10"), name="MAX_UPLOAD_MB"
        )
        self.max_upload_pixels: int = _positive_int(
            values.get("MAX_UPLOAD_PIXELS", "25_000_000"),
            name="MAX_UPLOAD_PIXELS",
        )
        self.max_upload_expansion_ratio: int = _positive_int(
            values.get("MAX_UPLOAD_EXPANSION_RATIO", "200"),
            name="MAX_UPLOAD_EXPANSION_RATIO",
        )
        self.max_request_body_bytes: int = _positive_int(
            values.get("MAX_REQUEST_BODY_BYTES", "12_000_000"),
            name="MAX_REQUEST_BODY_BYTES",
        )
        self.rate_limit_requests: int = _positive_int(
            values.get("RATE_LIMIT_REQUESTS", "20"),
            name="RATE_LIMIT_REQUESTS",
        )
        self.rate_limit_window_seconds: int = _positive_int(
            values.get("RATE_LIMIT_WINDOW_SECONDS", "60"),
            name="RATE_LIMIT_WINDOW_SECONDS",
        )
        self.run_real_ai_smoke: bool = _as_bool(
            values.get("RUN_REAL_AI_SMOKE", "0"),
            name="RUN_REAL_AI_SMOKE",
        )

    @property
    def is_demo(self) -> bool:
        return self.app_env == "development" and self.ai_provider == "demo"

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    def validate_runtime_configuration(self) -> None:
        if self.app_env not in {"development", "test", "production"}:
            raise RuntimeError("APP_ENV debe ser development, test o production.")
        if self.ai_provider not in {"demo", "openai-compatible"}:
            raise RuntimeError("AI_PROVIDER no es compatible.")
        if self.vision_provider not in {"demo", "openai-compatible"}:
            raise RuntimeError("VISION_PROVIDER no es compatible.")
        if self.object_storage_provider not in {"local", "s3"}:
            raise RuntimeError("OBJECT_STORAGE_PROVIDER no es compatible.")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL es obligatoria.")
        if not self.session_cookie_name:
            raise RuntimeError("SESSION_COOKIE_NAME es obligatoria.")
        if not self.allowed_origin_list:
            raise RuntimeError("ALLOWED_ORIGINS debe contener al menos un origen.")

        if self.ai_provider == "openai-compatible":
            if not self.ai_base_url or not self.ai_api_key or not self.ai_model:
                raise RuntimeError(
                    "AI_BASE_URL, AI_API_KEY y AI_MODEL son obligatorias para openai-compatible."
                )
            if self.ai_model == "demo-v1":
                raise RuntimeError(
                    "AI_MODEL debe identificar un modelo real para openai-compatible."
                )
            _validate_http_url(
                self.ai_base_url,
                name="AI_BASE_URL",
                require_https=self.app_env == "production",
            )

        if self.vision_provider == "openai-compatible":
            if not self.vision_base_url or not self.vision_api_key or not self.vision_model:
                raise RuntimeError(
                    "VISION_BASE_URL, VISION_API_KEY y VISION_MODEL son obligatorias para openai-compatible."
                )
            _validate_http_url(
                self.vision_base_url,
                name="VISION_BASE_URL",
                require_https=self.app_env == "production",
            )

        if self.ai_http_referer:
            _validate_http_url(
                self.ai_http_referer,
                name="AI_HTTP_REFERER",
                require_https=self.app_env == "production",
            )

        if self.app_env != "production":
            return

        if self.jwt_secret == "replace-in-local-env" or len(self.jwt_secret) < 32:
            raise RuntimeError("La configuración de producción tiene un JWT_SECRET inseguro.")
        if self.object_storage_provider != "s3":
            raise RuntimeError("OBJECT_STORAGE_PROVIDER debe ser s3 en producción.")
        if not all(
            [
                self.object_storage_endpoint,
                self.object_storage_access_key,
                self.object_storage_secret_key,
                self.object_storage_bucket,
            ]
        ):
            raise RuntimeError("La configuración S3 de producción está incompleta.")
        if self.ai_provider != "openai-compatible":
            raise RuntimeError("AI_PROVIDER debe ser openai-compatible en producción.")
        if not self.redis_url:
            raise RuntimeError("REDIS_URL es obligatoria en producción.")
        for origin in self.allowed_origin_list:
            _validate_http_url(origin, name="ALLOWED_ORIGINS", require_https=True)

        # Phase 1 explicitly permits VISION_PROVIDER=demo in production.


settings = Settings()
