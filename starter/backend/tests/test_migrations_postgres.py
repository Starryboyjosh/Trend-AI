from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, text

from alembic import command
from app.core.config import settings

POSTGRES_URL = os.environ.get(
    "POSTGRES_MIGRATION_DATABASE_URL",
    os.environ.get("DATABASE_URL", ""),
)
_database_name = urlparse(POSTGRES_URL).path.rsplit("/", 1)[-1]
_enabled = os.environ.get("RUN_POSTGRES_MIGRATION_TESTS") == "1"
_safe_database = _database_name.endswith(("_test", "_migration_test"))

pytestmark = pytest.mark.skipif(
    not _enabled or not _safe_database or not POSTGRES_URL.startswith("postgresql"),
    reason=(
        "Prueba PostgreSQL omitida: requiere RUN_POSTGRES_MIGRATION_TESTS=1 y una URL "
        "PostgreSQL cuyo nombre termine en _test o _migration_test."
    ),
)

EXPECTED_TEMPLATE_IDS = {
    "tpl_reel_01",
    "tpl_static_01",
    "tpl_story_01",
    "tpl_video_01",
    "tpl_carousel_01",
    "tpl_whatsapp_01",
    "tpl_launch_01",
    "tpl_event_01",
}


@pytest.fixture()
def postgres_engine():
    engine = create_engine(POSTGRES_URL)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    previous_url = settings.database_url
    settings.database_url = POSTGRES_URL
    try:
        yield engine
    finally:
        settings.database_url = previous_url
        engine.dispose()


def _alembic_config() -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", POSTGRES_URL.replace("%", "%%"))
    return config


def _upgrade(revision: str) -> None:
    command.upgrade(_alembic_config(), revision)


def _template_ids(engine) -> list[str]:
    with engine.connect() as connection:
        return list(connection.scalars(text("SELECT id FROM templates ORDER BY id")))


def test_upgrade_empty_postgres_to_head(postgres_engine) -> None:
    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "016"
    assert set(_template_ids(postgres_engine)) == EXPECTED_TEMPLATE_IDS


def test_phase1_templates_are_seeded_once_and_upgrade_is_repeatable(postgres_engine) -> None:
    _upgrade("head")
    before = _template_ids(postgres_engine)
    command.downgrade(_alembic_config(), "011")
    _upgrade("head")
    after = _template_ids(postgres_engine)
    assert before == after
    assert len(after) == len(EXPECTED_TEMPLATE_IDS)
    assert len(after) == len(set(after))


def test_existing_template_is_not_overwritten(postgres_engine) -> None:
    _upgrade("011")
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO templates "
                "(id, title, platforms, formats, category, objective, thumbnail_url, "
                "editable_slots, description) VALUES "
                "(:id, :title, :platforms, :formats, :category, :objective, :thumbnail_url, "
                ":editable_slots, :description)"
            ),
            {
                "id": "tpl_reel_01",
                "title": "Título personalizado",
                "platforms": "[]",
                "formats": "[]",
                "category": "custom",
                "objective": "custom",
                "thumbnail_url": "/custom.svg",
                "editable_slots": "[]",
                "description": "Contenido personalizado.",
            },
        )
    _upgrade("head")
    with postgres_engine.connect() as connection:
        row = connection.execute(
            text("SELECT title, description FROM templates WHERE id = 'tpl_reel_01'")
        ).one()
    assert row.title == "Título personalizado"
    assert row.description == "Contenido personalizado."


def test_downgrade_preserves_seeded_templates(postgres_engine) -> None:
    _upgrade("head")
    command.downgrade(_alembic_config(), "011")
    assert set(_template_ids(postgres_engine)) == EXPECTED_TEMPLATE_IDS


def test_upgrade_from_013_adds_pending_signup_schema(postgres_engine) -> None:
    _upgrade("013")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.pending_signups')")) is None
    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.pending_signups')"))
        assert connection.scalar(text("SELECT to_regclass('public.user_preferences')"))
        columns = {
            row.column_name
            for row in connection.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'businesses'"
                )
            )
        }
    assert {"website_url", "content_locale", "onboarding_completed_at"} <= columns


def test_upgrade_from_014_adds_google_oauth_schema(postgres_engine) -> None:
    _upgrade("014")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.oauth_accounts')")) is None
    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.oauth_accounts')"))
        assert connection.scalar(text("SELECT to_regclass('public.oauth_authorization_requests')"))
        constraints = {
            row.conname
            for row in connection.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = 'pending_signups'::regclass"
                )
            )
        }
    assert "uq_pending_signup_oauth_identity" in constraints


def test_upgrade_from_015_adds_ai_usage_events(postgres_engine) -> None:
    _upgrade("015")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.ai_usage_events')")) is None
    _upgrade("head")
    with postgres_engine.connect() as connection:
        columns = {
            row.column_name: row.data_type
            for row in connection.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_usage_events'"))
        }
        indexes = {
            row.indexname
            for row in connection.execute(text("SELECT indexname FROM pg_indexes WHERE tablename = 'ai_usage_events'"))
        }
        foreign_keys = {
            row.conname
            for row in connection.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = 'ai_usage_events'::regclass AND contype = 'f'"
                )
            )
        }
    assert columns["reported_cost"] == "numeric"
    assert {"workspace_id", "user_id", "created_at", "provider_request_id"} <= columns.keys()
    assert {
        "ix_ai_usage_events_workspace_id",
        "ix_ai_usage_events_user_id",
        "ix_ai_usage_events_created_at",
    } <= indexes
    assert len(foreign_keys) == 2
    command.downgrade(_alembic_config(), "015")
    _upgrade("head")
