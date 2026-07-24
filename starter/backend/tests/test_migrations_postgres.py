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
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "012"
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
