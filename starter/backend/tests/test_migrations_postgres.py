from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import pytest
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, text

import app.assets.models  # noqa: F401
import app.business.models  # noqa: F401
import app.conversations.models  # noqa: F401
import app.identity.models  # noqa: F401
import app.projects.models  # noqa: F401
import app.templates.models  # noqa: F401
import app.trends.models  # noqa: F401
from alembic import command
from app.core.config import settings
from app.db.base import Base

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
    "tpl_instagram_01",
    "tpl_instagram_02",
    "tpl_instagram_03",
    "tpl_instagram_04",
    "tpl_instagram_05",
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


def _public_template_ids(engine) -> list[str]:
    with engine.connect() as connection:
        return list(
            connection.scalars(text("SELECT id FROM templates WHERE is_public = true ORDER BY id"))
        )


def test_upgrade_empty_postgres_to_head(postgres_engine) -> None:
    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "020"
    assert set(_public_template_ids(postgres_engine)) == EXPECTED_TEMPLATE_IDS


def test_trend_framework_upgrade_downgrade_and_reupgrade(postgres_engine) -> None:
    _upgrade("018")
    _upgrade("019")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.trend_items')"))
        assert connection.scalar(text("SELECT to_regclass('public.trend_evidence')"))
        assert connection.scalar(text("SELECT to_regclass('public.trend_item_evidence')"))
        assert connection.scalar(text("SELECT to_regclass('public.trend_run_evidence')"))
    command.downgrade(_alembic_config(), "018")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.trend_items')")) is None
    _upgrade("019")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "019"


def test_trend_framework_schema_matches_the_sqlalchemy_models(postgres_engine) -> None:
    """019 owns these tables; compare only its declarative surface."""

    _upgrade("head")
    owned_tables = {
        "trend_runs",
        "trend_items",
        "trend_evidence",
        "trend_item_evidence",
        "trend_run_evidence",
        "workspace_trend_relevance",
    }
    with postgres_engine.connect() as connection:
        context = MigrationContext.configure(connection)
        diffs = _flatten_diffs(compare_metadata(context, Base.metadata))
    divergences = [entry for entry in diffs if _diff_table(entry) in owned_tables]
    assert divergences == [], f"019 no coincide con los modelos: {divergences}"


def test_real_trend_budget_upgrade_downgrade_and_schema(postgres_engine) -> None:
    _upgrade("019")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.trend_provider_budgets')")) is None
    _upgrade("020")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.trend_provider_budgets')"))
        context = MigrationContext.configure(connection)
        diffs = _flatten_diffs(compare_metadata(context, Base.metadata))
    divergences = [entry for entry in diffs if _diff_table(entry) == "trend_provider_budgets"]
    assert divergences == [], f"020 no coincide con los modelos: {divergences}"
    command.downgrade(_alembic_config(), "019")
    _upgrade("020")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "020"


def test_phase1_templates_are_seeded_once_and_upgrade_is_repeatable(postgres_engine) -> None:
    _upgrade("head")
    before = _public_template_ids(postgres_engine)
    command.downgrade(_alembic_config(), "011")
    _upgrade("head")
    after = _public_template_ids(postgres_engine)
    assert before == after
    assert len(after) == len(EXPECTED_TEMPLATE_IDS)
    assert len(after) == len(set(after))


def test_upgrade_hides_unapproved_templates_without_breaking_historical_rows(postgres_engine) -> None:
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
                "id": "tpl_unapproved",
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
        ids = set(connection.scalars(text("SELECT id FROM templates")))
        columns = {
            row.column_name
            for row in connection.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'templates'")
            )
        }
    assert "tpl_unapproved" in ids
    assert set(_public_template_ids(postgres_engine)) == EXPECTED_TEMPLATE_IDS
    assert {"canva_url", "aspect_ratio", "is_public"} <= columns


def test_downgrade_restores_a_016_compatible_template_catalog(postgres_engine) -> None:
    _upgrade("head")
    command.downgrade(_alembic_config(), "011")
    assert EXPECTED_TEMPLATE_IDS.isdisjoint(set(_template_ids(postgres_engine)))


def test_upgrade_from_013_adds_pending_signup_schema(postgres_engine) -> None:
    _upgrade("013")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.pending_signups')")) is None
    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.pending_signups')"))
        assert connection.scalar(text("SELECT to_regclass('public.user_preferences')"))
        pending_columns = {
            row.column_name
            for row in connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'pending_signups'"))
        }
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
    # The deletion status token lives on account_purge_jobs, never here.
    assert {"completion_response_json"} <= pending_columns
    assert {"status_token_hash", "status_token_expires_at"} & pending_columns == set()


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


def test_upgrade_from_016_adds_instagram_flow_timing(postgres_engine) -> None:
    _upgrade("016")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.creation_flow_events')")) is None
    _upgrade("head")
    with postgres_engine.connect() as connection:
        columns = {
            row.column_name
            for row in connection.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'creation_flow_events'")
            )
        }
    assert {"flow_started_at", "first_generation_completed_at", "elapsed_seconds", "completion_status", "flow_key"} <= columns
    command.downgrade(_alembic_config(), "016")
    _upgrade("head")


def test_upgrade_from_017_adds_account_lifecycle_schema(postgres_engine) -> None:
    _upgrade("017")
    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.account_purge_jobs')"))
        assert connection.scalar(text("SELECT to_regclass('public.admin_audit_events')"))
        assert connection.scalar(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='deletion_requested_at'"))

    # 020 -> 018 must leave no trace behind, so a redeploy can replay it.
    command.downgrade(_alembic_config(), "017")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT to_regclass('public.account_purge_jobs')")) is None
        assert connection.scalar(text("SELECT to_regclass('public.admin_audit_events')")) is None
        assert connection.scalar(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='deletion_requested_at'")) is None

    _upgrade("head")
    with postgres_engine.connect() as connection:
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "020"
        assert connection.scalar(text("SELECT to_regclass('public.account_purge_jobs')"))


def test_account_purge_job_survives_the_rows_it_deletes(postgres_engine) -> None:
    """No cascade may take the job away before it reports its outcome."""

    _upgrade("head")
    with postgres_engine.connect() as connection:
        referenced = list(
            connection.scalars(
                text(
                    "SELECT confrelid::regclass::text FROM pg_constraint "
                    "WHERE contype = 'f' AND conrelid = 'account_purge_jobs'::regclass"
                )
            )
        )
    assert referenced == []


def _flatten_diffs(diffs: list) -> list[tuple]:
    flat: list[tuple] = []
    for entry in diffs:
        flat.extend(entry) if isinstance(entry, list) else flat.append(entry)
    return flat


def _diff_table(entry: tuple) -> str | None:
    kind = entry[0]
    if kind in {"add_table", "remove_table"}:
        return entry[1].name
    if kind in {"add_column", "remove_column"} or kind.startswith("modify_"):
        return entry[2]
    return getattr(getattr(entry[1], "table", None), "name", None)


def _diff_column(entry: tuple) -> str | None:
    kind = entry[0]
    if kind in {"add_column", "remove_column"}:
        return entry[3].name
    if kind.startswith("modify_"):
        return entry[3]
    return None


def test_account_lifecycle_schema_matches_the_sqlalchemy_models(postgres_engine) -> None:
    """The schema Alembic builds for WAVE-009 must equal the declared models.

    The comparison is scoped to what this wave owns: tables created before it
    carry drift that predates this work and is not corrected here.
    """

    _upgrade("head")
    owned_tables = {"account_purge_jobs", "admin_audit_events"}
    with postgres_engine.connect() as connection:
        context = MigrationContext.configure(connection)
        diffs = _flatten_diffs(compare_metadata(context, Base.metadata))

    divergences = [
        entry
        for entry in diffs
        if _diff_table(entry) in owned_tables
        or (_diff_table(entry) == "users" and _diff_column(entry) == "deletion_requested_at")
    ]
    assert divergences == [], f"019 no coincide con los modelos: {divergences}"
