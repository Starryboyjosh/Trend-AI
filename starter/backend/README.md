# HiTrendy backend

FastAPI backend for the authenticated MVP: business context, conversations,
validated content generation, projects, templates, assets, visual review and
workspace authorization. Demo mode uses deterministic providers and requires no
external AI credentials.

```bash
PYTHONPATH=. ../../.venv/bin/alembic upgrade head
PYTHONPATH=. ../../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Run the backend suite from the repository root:

```bash
PYTHONPATH=starter/backend .venv/bin/pytest starter/backend/tests
```

Generation requests accept an optional `Idempotency-Key` header. Reusing the
same key for the same workspace and conversation returns the already persisted
result instead of creating another artifact.
