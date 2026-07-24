from __future__ import annotations

import pytest

from app.core.config import Settings
from app.providers.content import DemoContentModelProvider, OpenAICompatibleContentModelProvider
from app.providers.factory import get_content_provider, get_vision_provider
from app.providers.vision import DemoVisionReviewProvider

SECRET = "sentinel-config-secret-do-not-echo"


def _production_values() -> dict[str, str]:
    return {
        "APP_ENV": "production",
        "DATABASE_URL": "postgresql+psycopg://app:password@db/hitrendy",
        "REDIS_URL": "redis://redis:6379/0",
        "OBJECT_STORAGE_PROVIDER": "s3",
        "OBJECT_STORAGE_ENDPOINT": "https://storage.example",
        "OBJECT_STORAGE_ACCESS_KEY": "storage-access",
        "OBJECT_STORAGE_SECRET_KEY": "storage-secret",
        "OBJECT_STORAGE_BUCKET": "hitrendy-private",
        "AI_PROVIDER": "openai-compatible",
        "AI_BASE_URL": "https://openrouter.ai/api/v1",
        "AI_API_KEY": SECRET,
        "AI_MODEL": "approved-model",
        "AI_TIMEOUT_SECONDS": "30",
        "AI_MAX_RETRIES": "1",
        "AI_RETRY_BASE_SECONDS": "0.5",
        "VISION_PROVIDER": "demo",
        "VISION_MODEL": "demo-vision-v1",
        "JWT_SECRET": "j" * 32,
        "ALLOWED_ORIGINS": "https://app.example",
    }


@pytest.mark.parametrize("app_env", ["development", "test"])
def test_demo_provider_requires_no_ai_credentials_outside_production(app_env: str) -> None:
    settings = Settings(
        {
            "APP_ENV": app_env,
            "AI_PROVIDER": "demo",
            "AI_MODEL": "demo-v1",
            "AI_BASE_URL": "",
            "AI_API_KEY": "",
            "VISION_PROVIDER": "demo",
        }
    )

    settings.validate_runtime_configuration()

    assert settings.ai_provider == "demo"
    assert settings.ai_api_key == ""
    assert settings.ai_max_retries == 1
    assert settings.ai_retry_base_seconds == 0.5
    assert settings.run_real_ai_smoke is False


def test_openai_compatible_configuration_is_valid_and_typed() -> None:
    values = _production_values()
    settings = Settings(values)

    settings.validate_runtime_configuration()

    assert settings.ai_provider == "openai-compatible"
    assert settings.ai_base_url == "https://openrouter.ai/api/v1"
    assert settings.ai_max_retries == 1
    assert isinstance(settings.ai_timeout_seconds, float)
    assert isinstance(settings.run_real_ai_smoke, bool)


def test_production_allows_phase1_demo_vision() -> None:
    settings = Settings(_production_values())

    settings.validate_runtime_configuration()

    assert settings.vision_provider == "demo"


@pytest.mark.parametrize("field", ["AI_BASE_URL", "AI_API_KEY", "AI_MODEL"])
def test_openai_compatible_configuration_requires_all_real_fields(field: str) -> None:
    values = _production_values()
    values.pop(field)
    settings = Settings(values)

    with pytest.raises(RuntimeError, match=field):
        settings.validate_runtime_configuration()


@pytest.mark.parametrize("value", ["-1", "3", "not-a-number"])
def test_retry_count_is_bounded(value: str) -> None:
    values = {"AI_MAX_RETRIES": value}

    with pytest.raises(RuntimeError, match="AI_MAX_RETRIES"):
        Settings(values)


@pytest.mark.parametrize("value", ["0", "-0.1", "not-a-number"])
def test_retry_base_and_timeout_must_be_positive(value: str) -> None:
    with pytest.raises(RuntimeError):
        Settings({"AI_RETRY_BASE_SECONDS": value})
    with pytest.raises(RuntimeError):
        Settings({"AI_TIMEOUT_SECONDS": value})


def test_invalid_provider_values_fail_closed() -> None:
    with pytest.raises(RuntimeError, match="AI_PROVIDER"):
        Settings({"AI_PROVIDER": "unknown"}).validate_runtime_configuration()
    with pytest.raises(RuntimeError, match="VISION_PROVIDER"):
        Settings({"VISION_PROVIDER": "unknown"}).validate_runtime_configuration()


def test_configuration_errors_do_not_echo_secret() -> None:
    settings = Settings(
        {
            "AI_PROVIDER": "openai-compatible",
            "AI_API_KEY": SECRET,
            "AI_BASE_URL": "not-a-url",
            "AI_MODEL": "approved-model",
        }
    )

    with pytest.raises(RuntimeError) as caught:
        settings.validate_runtime_configuration()

    assert SECRET not in str(caught.value)


def test_factory_selects_explicit_demo_and_openai_compatible_providers(monkeypatch) -> None:
    demo_settings = Settings({"APP_ENV": "development", "AI_PROVIDER": "demo"})
    monkeypatch.setattr("app.providers.factory.settings", demo_settings)
    assert isinstance(get_content_provider(), DemoContentModelProvider)

    real_settings = Settings(
        {
            "APP_ENV": "development",
            "AI_PROVIDER": "openai-compatible",
            "AI_BASE_URL": "https://openrouter.ai/api/v1",
            "AI_API_KEY": SECRET,
            "AI_MODEL": "approved-model",
        }
    )
    monkeypatch.setattr("app.providers.factory.settings", real_settings)
    provider = get_content_provider()
    assert isinstance(provider, OpenAICompatibleContentModelProvider)
    assert provider.model_name == "approved-model"


def test_factory_keeps_demo_vision_available_in_production(monkeypatch) -> None:
    monkeypatch.setattr("app.providers.factory.settings", Settings(_production_values()))

    assert isinstance(get_vision_provider(), DemoVisionReviewProvider)
