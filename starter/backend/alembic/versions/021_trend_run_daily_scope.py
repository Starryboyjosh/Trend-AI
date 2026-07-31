"""Add an explicit durable UTC-day identity to trend runs.

Consolidating historical runs into one row per ``window_start + region +
category`` deletes rows whose ``id`` other durable contracts already point at.
The migration therefore materialises an explicit ``removed_id -> survivor_id``
mapping *before* deleting anything and rewrites every real reference through
it:

* ``trend_run_evidence.trend_run_id`` (the only foreign key to ``trend_runs``)
  is re-linked to the survivor so no evidence row is orphaned or deleted.
* the merged run reports merged source traceability.
* stored idempotent ``POST:/trends/refresh`` responses keep replaying byte for
  byte, except for the consolidated run id they returned.

Revision ID: 021
Revises: 020
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "021"
down_revision: str | None = "020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONSOLIDATION_TABLE = "trend_run_daily_scope_consolidation_021"

REFRESH_ENDPOINT = "POST:/trends/refresh"


def upgrade() -> None:
    op.add_column(
        "trend_runs",
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        """
        UPDATE trend_runs
        SET
            region = upper(btrim(region)),
            category = nullif(lower(btrim(category)), ''),
            window_start = (
                date_trunc('day', started_at AT TIME ZONE 'UTC')
                AT TIME ZONE 'UTC'
            )
        """
    )

    # Deterministic survivor per scope/day, computed once and stored so every
    # later statement (and the DELETE itself) uses exactly the same mapping.
    op.execute(f"DROP TABLE IF EXISTS {CONSOLIDATION_TABLE}")
    op.execute(
        f"""
        CREATE TEMPORARY TABLE {CONSOLIDATION_TABLE} AS
        WITH ranked AS (
            SELECT
                id,
                first_value(id) OVER scope AS survivor_id,
                row_number() OVER scope AS position
            FROM trend_runs
            WINDOW scope AS (
                PARTITION BY window_start, region, category
                ORDER BY
                    CASE status
                        WHEN 'completed' THEN 0
                        WHEN 'partial' THEN 1
                        WHEN 'processing' THEN 2
                        WHEN 'pending' THEN 3
                        ELSE 4
                    END,
                    finished_at DESC NULLS LAST,
                    started_at DESC,
                    id
            )
        )
        SELECT id AS removed_id, survivor_id
        FROM ranked
        WHERE position > 1
        """
    )
    op.execute(
        f"""
        CREATE UNIQUE INDEX ON {CONSOLIDATION_TABLE} (removed_id)
        """
    )

    # 1. Evidence links from every redundant run move to the survivor.
    #    Evidence rows themselves are never touched, so TrendEvidence ids and
    #    their private payloads stay exactly as they were.
    op.execute(
        f"""
        INSERT INTO trend_run_evidence (trend_run_id, trend_evidence_id)
        SELECT mapping.survivor_id, links.trend_evidence_id
        FROM {CONSOLIDATION_TABLE} AS mapping
        JOIN trend_run_evidence AS links
          ON links.trend_run_id = mapping.removed_id
        ON CONFLICT DO NOTHING
        """
    )

    # 2. The survivor reports the merged traceability of the whole scope/day:
    #    attempted = union of everything attempted, succeeded = union of
    #    everything that succeeded (including whatever produced the evidence
    #    now linked to the survivor), failed = union of failures minus the
    #    sources that ultimately succeeded. Ordering is stable and duplicate
    #    free; malformed legacy values degrade to an empty array instead of
    #    aborting the migration.
    op.execute(
        f"""
        WITH members AS (
            SELECT survivor_id, survivor_id AS run_id FROM {CONSOLIDATION_TABLE}
            UNION
            SELECT survivor_id, removed_id FROM {CONSOLIDATION_TABLE}
        ),
        survivors AS (
            SELECT DISTINCT survivor_id FROM members
        ),
        run_sources AS (
            SELECT DISTINCT
                members.survivor_id,
                bucket.name AS bucket,
                element AS source
            FROM members
            JOIN trend_runs ON trend_runs.id = members.run_id
            CROSS JOIN LATERAL (
                VALUES
                    ('attempted', trend_runs.sources_attempted),
                    ('succeeded', trend_runs.sources_succeeded),
                    ('failed', trend_runs.sources_failed)
            ) AS bucket(name, payload)
            CROSS JOIN LATERAL json_array_elements_text(
                CASE
                    WHEN bucket.payload IS JSON ARRAY THEN bucket.payload::json
                    ELSE '[]'::json
                END
            ) AS element
        ),
        evidence_sources AS (
            SELECT DISTINCT members.survivor_id, trend_evidence.source
            FROM members
            JOIN trend_run_evidence AS links
              ON links.trend_run_id = members.run_id
            JOIN trend_evidence ON trend_evidence.id = links.trend_evidence_id
        ),
        succeeded AS (
            SELECT survivor_id, source FROM run_sources WHERE bucket = 'succeeded'
            UNION
            SELECT survivor_id, source FROM evidence_sources
        ),
        failed AS (
            SELECT survivor_id, source FROM run_sources WHERE bucket = 'failed'
            EXCEPT
            SELECT survivor_id, source FROM succeeded
        ),
        attempted AS (
            SELECT survivor_id, source FROM run_sources
            UNION
            SELECT survivor_id, source FROM succeeded
        ),
        merged AS (
            SELECT
                survivors.survivor_id,
                COALESCE(attempted_agg.sources, '[]') AS sources_attempted,
                COALESCE(succeeded_agg.sources, '[]') AS sources_succeeded,
                COALESCE(failed_agg.sources, '[]') AS sources_failed
            FROM survivors
            LEFT JOIN (
                SELECT
                    survivor_id,
                    json_agg(source ORDER BY source COLLATE "C")::text AS sources
                FROM attempted
                GROUP BY survivor_id
            ) AS attempted_agg USING (survivor_id)
            LEFT JOIN (
                SELECT
                    survivor_id,
                    json_agg(source ORDER BY source COLLATE "C")::text AS sources
                FROM succeeded
                GROUP BY survivor_id
            ) AS succeeded_agg USING (survivor_id)
            LEFT JOIN (
                SELECT
                    survivor_id,
                    json_agg(source ORDER BY source COLLATE "C")::text AS sources
                FROM failed
                GROUP BY survivor_id
            ) AS failed_agg USING (survivor_id)
        )
        UPDATE trend_runs
        SET
            sources_attempted = merged.sources_attempted,
            sources_succeeded = merged.sources_succeeded,
            sources_failed = merged.sources_failed
        FROM merged
        WHERE trend_runs.id = merged.survivor_id
        """
    )

    # 3. Stored idempotent refresh responses must keep replaying, so the run id
    #    they returned is repointed to the survivor. Only the "id" member of a
    #    valid JSON object belonging to a completed POST:/trends/refresh record
    #    is rewritten: key order, formatting and every other member (including
    #    the workspace, key, payload hash and status columns) are preserved.
    op.execute(
        f"""
        WITH parsed AS MATERIALIZED (
            SELECT
                records.id AS record_id,
                records.response_json::json AS document
            FROM idempotency_records AS records
            WHERE records.endpoint = '{REFRESH_ENDPOINT}'
              AND records.status = 'completed'
              AND records.response_json IS JSON OBJECT
        ),
        targeted AS (
            SELECT parsed.record_id, parsed.document, mapping.survivor_id
            FROM parsed
            JOIN {CONSOLIDATION_TABLE} AS mapping
              ON mapping.removed_id = parsed.document ->> 'id'
        ),
        rewritten AS (
            SELECT
                targeted.record_id,
                json_object_agg(
                    entry.key,
                    CASE
                        WHEN entry.key = 'id' THEN to_json(targeted.survivor_id)
                        ELSE entry.value
                    END
                    ORDER BY entry.ordinality
                )::text AS response_json
            FROM targeted
            CROSS JOIN LATERAL json_each(targeted.document)
                WITH ORDINALITY AS entry(key, value, ordinality)
            GROUP BY targeted.record_id
        )
        UPDATE idempotency_records AS records
        SET response_json = rewritten.response_json
        FROM rewritten
        WHERE records.id = rewritten.record_id
        """
    )

    # 4. Only now the redundant runs can go away.
    op.execute(
        f"""
        DELETE FROM trend_runs
        USING {CONSOLIDATION_TABLE} AS mapping
        WHERE trend_runs.id = mapping.removed_id
        """
    )
    op.execute(f"DROP TABLE IF EXISTS {CONSOLIDATION_TABLE}")

    op.alter_column("trend_runs", "window_start", nullable=False)
    op.create_unique_constraint(
        "uq_trend_run_daily_scope",
        "trend_runs",
        ["window_start", "region", "category"],
        postgresql_nulls_not_distinct=True,
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_trend_run_daily_scope",
        "trend_runs",
        type_="unique",
    )
    op.drop_column("trend_runs", "window_start")
