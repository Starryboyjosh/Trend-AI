from __future__ import annotations

from collections.abc import Mapping
from ipaddress import ip_address, ip_network
from os import environ
from pathlib import Path
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
    if parsed.username or parsed.password:
        raise RuntimeError(f"{name} no debe contener credenciales embebidas.")


def _normalize_origin(value: str, *, require_https: bool) -> str:
    value = value.strip()
    _validate_http_url(value, name="ALLOWED_ORIGINS", require_https=require_https)
    parsed = urlparse(value)
    if parsed.path not in {"", "/"} or parsed.params or parsed.query or parsed.fragment:
        raise RuntimeError("ALLOWED_ORIGINS debe contener únicamente orígenes, sin paths ni query strings.")
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def _normalize_database_url(value: str) -> str:
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    return value


def _is_local_database_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme.startswith("sqlite") or parsed.hostname in {
        None,
        "localhost",
        "127.0.0.1",
        "::1",
        "postgres",
        "db",
    }


def _normalize_origin_list(value: str, *, require_https: bool) -> list[str]:
    normalized: list[str] = []
    for origin in value.split(","):
        if not origin.strip():
            continue
        candidate = _normalize_origin(origin, require_https=require_https)
        if candidate not in normalized:
            normalized.append(candidate)
    return normalized


def _validate_forwarded_allow_ips(value: str, *, production_like: bool) -> list[str]:
    entries = [entry.strip() for entry in value.split(",") if entry.strip()]
    for entry in entries:
        if entry == "*":
            if production_like:
                raise RuntimeError("FORWARDED_ALLOW_IPS no puede usar '*' en staging o producción.")
            continue
        try:
            if "/" in entry:
                ip_network(entry, strict=False)
            else:
                ip_address(entry)
        except ValueError as exc:
            raise RuntimeError("FORWARDED_ALLOW_IPS debe contener IPs o CIDRs válidos.") from exc
    return entries


def _validate_host(value: str, *, name: str) -> str:
    if not value or value.startswith(".") or ".." in value:
        raise RuntimeError(f"{name} no es un host válido.")
    return value


VALID_ENVS = {"development", "test", "staging", "production"}
PRODUCTION_LIKE = {"staging", "production"}


class Settings:
    def __init__(self, source: Mapping[str, str] | None = None) -> None:
        values = environ if source is None else source

        self.app_env: str = values.get("APP_ENV", "development").strip().lower()
        self.app_name: str = values.get("APP_NAME", "HiTrendy").strip() or "HiTrendy"
        self.api_prefix: str = values.get("API_PREFIX", "/api/v1").strip() or "/api/v1"

        self.database_url: str = _normalize_database_url(
            values.get("DATABASE_URL", "sqlite:///./hitrendy.db").strip()
        )
        default_ssl_mode = "disable" if _is_local_database_url(self.database_url) else "require"
        self.database_ssl_mode: str = values.get(
            "DATABASE_SSL_MODE", default_ssl_mode
        ).strip().lower()
        self.database_pool_size: int = _positive_int(
            values.get("DATABASE_POOL_SIZE", "5"), name="DATABASE_POOL_SIZE"
        )
        self.database_max_overflow: int = _non_negative_int(
            values.get("DATABASE_MAX_OVERFLOW", "10"),
            name="DATABASE_MAX_OVERFLOW",
            maximum=100,
        )
        self.database_pool_timeout: int = _positive_int(
            values.get("DATABASE_POOL_TIMEOUT", "30"), name="DATABASE_POOL_TIMEOUT"
        )
        self.database_pool_recycle: int = _positive_int(
            values.get("DATABASE_POOL_RECYCLE", "1800"), name="DATABASE_POOL_RECYCLE"
        )
        self.redis_url: str = values.get("REDIS_URL", "").strip()
        self.redis_provider: str = values.get(
            "REDIS_PROVIDER", "redis" if self.app_env in PRODUCTION_LIKE else "memory"
        ).strip().lower()
        self.redis_required: bool = _as_bool(
            values.get("REDIS_REQUIRED", "1" if self.app_env in PRODUCTION_LIKE else "0"),
            name="REDIS_REQUIRED",
        )
        self.upstash_redis_rest_url: str = values.get("UPSTASH_REDIS_REST_URL", "").strip().rstrip("/")
        self.upstash_redis_rest_token: str = values.get("UPSTASH_REDIS_REST_TOKEN", "").strip()
        self.redis_prefix: str = values.get("REDIS_PREFIX", f"hitrendy:{self.app_env}").strip()
        self.redis_default_ttl_seconds: int = _positive_int(
            values.get("REDIS_DEFAULT_TTL_SECONDS", "300"),
            name="REDIS_DEFAULT_TTL_SECONDS",
        )

        self.object_storage_endpoint: str = values.get("OBJECT_STORAGE_ENDPOINT", "").strip()
        self.object_storage_access_key: str = values.get("OBJECT_STORAGE_ACCESS_KEY", "").strip()
        self.object_storage_secret_key: str = values.get("OBJECT_STORAGE_SECRET_KEY", "").strip()
        self.object_storage_bucket: str = values.get("OBJECT_STORAGE_BUCKET", "hitrendy").strip()
        self.object_storage_provider: str = (
            values.get("STORAGE_PROVIDER", values.get("OBJECT_STORAGE_PROVIDER", "local"))
            .strip()
            .lower()
        )
        self.object_storage_local_dir: str = values.get(
            "OBJECT_STORAGE_LOCAL_DIR", "./storage"
        ).strip()
        self.supabase_url: str = values.get("SUPABASE_URL", "").strip().rstrip("/")
        self.supabase_service_role_key: str = values.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        self.supabase_storage_bucket: str = values.get(
            "SUPABASE_STORAGE_BUCKET", "hitrendy-private"
        ).strip()
        self.storage_timeout_seconds: float = _positive_float(
            values.get("STORAGE_TIMEOUT_SECONDS", "10"), name="STORAGE_TIMEOUT_SECONDS"
        )

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
        self.openrouter_api_key: str = values.get("OPENROUTER_API_KEY", "").strip()
        self.openrouter_base_url: str = values.get(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        ).strip().rstrip("/")
        self.openrouter_fast_model: str = values.get(
            "OPENROUTER_FAST_MODEL", "openrouter/free"
        ).strip()
        self.openrouter_balanced_model: str = values.get("OPENROUTER_BALANCED_MODEL", "").strip()
        self.openrouter_quality_model: str = values.get("OPENROUTER_QUALITY_MODEL", "").strip()
        self.openrouter_catalog_ttl_seconds: int = _positive_int(
            values.get("OPENROUTER_CATALOG_TTL_SECONDS", "3600"),
            name="OPENROUTER_CATALOG_TTL_SECONDS",
        )

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
        self.allowed_origin_values = _normalize_origin_list(
            values.get("ALLOWED_ORIGINS", "http://localhost:3000"),
            require_https=self.app_env in PRODUCTION_LIKE,
        )
        self.allowed_origins: str = ",".join(self.allowed_origin_values)
        self.frontend_url: str = values.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")
        self.google_sign_in_enabled: bool = _as_bool(
            values.get("GOOGLE_SIGN_IN_ENABLED", "0"),
            name="GOOGLE_SIGN_IN_ENABLED",
        )
        self.google_client_id: str = values.get("GOOGLE_CLIENT_ID", "").strip()
        self.google_client_secret: str = values.get("GOOGLE_CLIENT_SECRET", "").strip()
        self.google_redirect_uri: str = values.get("GOOGLE_REDIRECT_URI", "").strip()
        self.google_oauth_state_ttl_seconds: int = _positive_int(
            values.get("GOOGLE_OAUTH_STATE_TTL_SECONDS", "600"),
            name="GOOGLE_OAUTH_STATE_TTL_SECONDS",
            minimum=60,
        )

        self.allowed_hosts_str: str = values.get("ALLOWED_HOSTS", "").strip()
        self.forwarded_allow_ips_str: str = values.get("FORWARDED_ALLOW_IPS", "").strip()
        self.csrf_enabled: bool = _as_bool(
            values.get("CSRF_ENABLED", "1"),
            name="CSRF_ENABLED",
        )
        self.hsts_max_age_seconds: int = _positive_int(
            values.get("HSTS_MAX_AGE_SECONDS", "31536000"),
            name="HSTS_MAX_AGE_SECONDS",
        )
        self.hsts_include_subdomains: bool = _as_bool(
            values.get("HSTS_INCLUDE_SUBDOMAINS", "1"),
            name="HSTS_INCLUDE_SUBDOMAINS",
        )

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

        self.image_generation_enabled: bool = _as_bool(
            values.get("IMAGE_GENERATION_ENABLED", "0"),
            name="IMAGE_GENERATION_ENABLED",
        )
        self.video_generation_enabled: bool = _as_bool(
            values.get("VIDEO_GENERATION_ENABLED", "0"),
            name="VIDEO_GENERATION_ENABLED",
        )
        self.trend_analysis_enabled: bool = _as_bool(
            values.get("TREND_ANALYSIS_ENABLED", "0"),
            name="TREND_ANALYSIS_ENABLED",
        )
        self.allow_paid_model_fallback: bool = _as_bool(
            values.get("ALLOW_PAID_MODEL_FALLBACK", "0"),
            name="ALLOW_PAID_MODEL_FALLBACK",
        )

    @property
    def is_demo(self) -> bool:
        return self.app_env == "development" and self.ai_provider == "demo"

    @property
    def allowed_origin_list(self) -> list[str]:
        return list(self.allowed_origin_values)

    @property
    def allowed_hosts(self) -> list[str]:
        return [h.strip().lower() for h in self.allowed_hosts_str.split(",") if h.strip()]

    @property
    def forwarded_allow_ips(self) -> list[str]:
        return _validate_forwarded_allow_ips(
            self.forwarded_allow_ips_str,
            production_like=self.is_production_like,
        )

    @property
    def is_production_like(self) -> bool:
        return self.app_env in PRODUCTION_LIKE

    @property
    def google_sign_in_configured(self) -> bool:
        return self.google_sign_in_enabled and all(
            [self.google_client_id, self.google_client_secret, self.google_redirect_uri]
        )

    def validate_runtime_configuration(self) -> None:
        if self.app_env not in VALID_ENVS:
            raise RuntimeError(
                f"APP_ENV debe ser {' ,'.join(sorted(VALID_ENVS))}."
            )
        if self.ai_provider not in {"demo", "openai-compatible", "openrouter"}:
            raise RuntimeError("AI_PROVIDER no es compatible.")
        if self.vision_provider not in {"demo", "openai-compatible"}:
            raise RuntimeError("VISION_PROVIDER no es compatible.")
        if self.object_storage_provider not in {"local", "s3", "supabase", "disabled"}:
            raise RuntimeError("OBJECT_STORAGE_PROVIDER no es compatible.")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL es obligatoria.")
        parsed_database_url = urlparse(self.database_url)
        if parsed_database_url.scheme not in {
            "sqlite",
            "sqlite+aiosqlite",
            "postgresql+psycopg",
        }:
            raise RuntimeError("DATABASE_URL debe usar SQLite o PostgreSQL con psycopg.")
        if self.database_ssl_mode not in {"disable", "prefer", "require"}:
            raise RuntimeError("DATABASE_SSL_MODE debe ser disable, prefer o require.")
        if (
            parsed_database_url.scheme == "postgresql+psycopg"
            and not parsed_database_url.hostname
        ):
            raise RuntimeError("DATABASE_URL debe incluir un host PostgreSQL válido.")
        if (
            self.is_production_like
            and not _is_local_database_url(self.database_url)
            and self.database_ssl_mode != "require"
        ):
            raise RuntimeError("DATABASE_SSL_MODE debe ser require para PostgreSQL remoto.")
        if self.redis_provider not in {"disabled", "memory", "redis"}:
            raise RuntimeError("REDIS_PROVIDER no es compatible.")
        if not self.redis_prefix or any(character.isspace() for character in self.redis_prefix):
            raise RuntimeError("REDIS_PREFIX debe ser un prefijo no vacío sin espacios.")
        if self.redis_provider == "redis":
            has_redis_url = bool(self.redis_url)
            has_upstash_rest = bool(self.upstash_redis_rest_url and self.upstash_redis_rest_token)
            if not has_redis_url and not has_upstash_rest:
                raise RuntimeError(
                    "REDIS_URL o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son obligatorias para REDIS_PROVIDER=redis."
                )
            if self.upstash_redis_rest_url:
                _validate_http_url(
                    self.upstash_redis_rest_url,
                    name="UPSTASH_REDIS_REST_URL",
                    require_https=self.is_production_like,
                )
        elif self.redis_required:
            raise RuntimeError("REDIS_REQUIRED requiere REDIS_PROVIDER=redis.")
        if self.object_storage_provider == "local":
            if not self.object_storage_local_dir:
                raise RuntimeError("OBJECT_STORAGE_LOCAL_DIR es obligatoria para almacenamiento local.")
            if Path(self.object_storage_local_dir).expanduser().resolve() == Path("/"):
                raise RuntimeError("OBJECT_STORAGE_LOCAL_DIR no puede apuntar a la raíz del sistema.")
        if self.object_storage_provider == "supabase":
            if not all(
                [self.supabase_url, self.supabase_service_role_key, self.supabase_storage_bucket]
            ):
                raise RuntimeError("La configuración Supabase Storage está incompleta.")
            _validate_http_url(
                self.supabase_url,
                name="SUPABASE_URL",
                require_https=self.is_production_like,
            )
        if not self.session_cookie_name:
            raise RuntimeError("SESSION_COOKIE_NAME es obligatoria.")
        if not self.allowed_origin_list:
            raise RuntimeError("ALLOWED_ORIGINS debe contener al menos un origen.")
        if self.google_sign_in_configured:
            _validate_http_url(
                self.frontend_url,
                name="FRONTEND_URL",
                require_https=self.is_production_like,
            )
            if self.frontend_url not in self.allowed_origin_list:
                raise RuntimeError("FRONTEND_URL debe estar incluida en ALLOWED_ORIGINS para Google.")
            _validate_http_url(
                self.google_redirect_uri,
                name="GOOGLE_REDIRECT_URI",
                require_https=self.is_production_like,
            )

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
                require_https=self.is_production_like,
            )

        if self.ai_provider == "openrouter":
            if not self.openrouter_api_key or not self.openrouter_fast_model:
                raise RuntimeError(
                    "OPENROUTER_API_KEY y OPENROUTER_FAST_MODEL son obligatorias para openrouter."
                )
            if self.openrouter_fast_model != "openrouter/free":
                raise RuntimeError(
                    "OPENROUTER_FAST_MODEL debe ser openrouter/free durante WAVE-008B."
                )
            _validate_http_url(
                self.openrouter_base_url,
                name="OPENROUTER_BASE_URL",
                require_https=self.is_production_like,
            )

        if self.vision_provider == "openai-compatible":
            if not self.vision_base_url or not self.vision_api_key or not self.vision_model:
                raise RuntimeError(
                    "VISION_BASE_URL, VISION_API_KEY y VISION_MODEL son obligatorias para openai-compatible."
                )
            _validate_http_url(
                self.vision_base_url,
                name="VISION_BASE_URL",
                require_https=self.is_production_like,
            )

        if self.ai_http_referer:
            _validate_http_url(
                self.ai_http_referer,
                name="AI_HTTP_REFERER",
                require_https=self.is_production_like,
            )

        _ = self.forwarded_allow_ips

        if self.allowed_hosts_str:
            for host in self.allowed_hosts:
                _validate_host(host, name="ALLOWED_HOSTS")

        if not self.is_production_like:
            return

        if self.jwt_secret == "replace-in-local-env" or len(self.jwt_secret) < 32:
            raise RuntimeError("La configuración de producción tiene un JWT_SECRET inseguro.")
        if self.object_storage_provider not in {"s3", "supabase"}:
            raise RuntimeError("STORAGE_PROVIDER debe ser s3 o supabase en producción.")
        if self.object_storage_provider == "s3" and not all(
            [
                self.object_storage_endpoint,
                self.object_storage_access_key,
                self.object_storage_secret_key,
                self.object_storage_bucket,
            ]
        ):
            raise RuntimeError("La configuración S3 de producción está incompleta.")
        if self.ai_provider not in {"openai-compatible", "openrouter"}:
            raise RuntimeError(
                "AI_PROVIDER debe ser openai-compatible u openrouter en producción."
            )
        if not self.csrf_enabled:
            raise RuntimeError("CSRF_ENABLED debe ser true en staging y producción.")

        if not self.allowed_hosts_str:
            raise RuntimeError("ALLOWED_HOSTS es obligatorio en staging y producción.")

        localhost_origins = {"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"}
        for origin in self.allowed_origin_list:
            if origin in localhost_origins:
                raise RuntimeError("ALLOWED_ORIGINS no debe incluir localhost en producción.")

        if not self.frontend_url.startswith("https://"):
            raise RuntimeError("FRONTEND_URL debe usar HTTPS en producción.")

        for host in self.allowed_hosts:
            if host in {"localhost", "127.0.0.1", "::1"}:
                raise RuntimeError("ALLOWED_HOSTS no debe incluir localhost en producción.")


settings = Settings()
