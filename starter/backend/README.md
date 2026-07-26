# HiTrendy backend

FastAPI backend for the authenticated MVP: business context, conversations,
validated content generation, projects, templates, assets, visual review and
workspace authorization. Demo mode uses deterministic providers and requires no
external AI credentials.

```bash
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

Run the backend suite from the repository root:

```bash
PYTHONPATH=starter/backend python -m pytest starter/backend/tests
```

Install backend dependencies for development with:

```bash
python -m pip install -r requirements-dev.txt
```

Generation requests accept an optional `Idempotency-Key` header. Reusing the
same key for the same workspace, conversation, and payload returns the already
persisted result instead of creating another artifact. Reusing it with a
different payload returns a conflict, and concurrent requests reserve the key
before invoking the provider.

## Backend E2E Tests

The E2E suite uses the real FastAPI application over HTTP and an isolated
PostgreSQL database. It never uses the development database named `hitrendy`.

### Requisitos

- Docker Compose.
- Python environment with `starter/backend/requirements.txt` installed.
- PostgreSQL de pruebas accesible mediante `TEST_DATABASE_URL`.

The repository includes a separate `postgres-test` service on port `5433`:

```bash
docker compose up -d postgres-test
export TEST_DATABASE_URL='postgresql+psycopg://hitrendy:hitrendy@localhost:5433/hitrendy_test'
```

The E2E fixtures reject URLs that are not PostgreSQL or whose database name
does not end in `_test` or `_e2e`. They reset only that explicitly named test
database, apply all Alembic migrations from an empty schema through `013`,
and run the migration command twice to verify repeatability. The schema is
cleaned again after the E2E session.

### Ejecución

From `starter/backend`:

```bash
source ../../.venv/bin/activate

# Suite rápida, sin PostgreSQL E2E
python -m pytest -m "not e2e"
python -m ruff check .

# Sólo E2E
TEST_DATABASE_URL='postgresql+psycopg://hitrendy:hitrendy@localhost:5433/hitrendy_test' \
  python -m pytest -m e2e -v

# Suite completa
TEST_DATABASE_URL='postgresql+psycopg://hitrendy:hitrendy@localhost:5433/hitrendy_test' \
  python -m pytest
```

Without `TEST_DATABASE_URL`, E2E tests are skipped with an explicit reason;
they are not silently considered passed. If the variable is set but unsafe,
pytest aborts before changing any database.

### Provider de pruebas y cobertura

`tests/e2e/fake_provider.py` injects a deterministic provider into the real
conversation route. It performs no network calls, returns schema-valid social
posts and video scripts, counts invocations, and can simulate temporary,
permanent, and delayed failures. The suite covers health/readiness, migrated
templates, identity and workspace authorization, complete generation and
persistence, idempotency, concurrent requests, variations, normalized errors,
cross-workspace isolation, and replay from a new HTTP session.
