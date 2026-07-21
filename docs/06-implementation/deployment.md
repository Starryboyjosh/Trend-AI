---
id: IMPL-DEPLOY-001
kind: operations_spec
status: proposed
---

# Deployment

## Environments

- Local: demo provider, Docker dependencies.
- Staging: isolated database/storage, optional low-cost provider.
- Production: managed secrets, backups, monitoring, explicit provider limits.

## Build artifacts

- Web container or platform build.
- API container based on official Python image.
- Worker container only when background jobs are enabled.

## Release sequence

1. Run lint, typecheck, unit, contract, integration, and build checks.
2. Build immutable images.
3. Run database migration job.
4. Deploy API.
5. Run smoke tests.
6. Deploy web.
7. Monitor errors and provider behavior.

## Backups

- Automated PostgreSQL backups.
- Object-storage versioning or backup policy.
- Restore test before public launch.

## Health endpoints

- `/health/live`: process alive.
- `/health/ready`: database and required dependencies available.
- Provider availability is reported separately and does not necessarily make the whole API unready.

## Secrets

- Inject through deployment secret manager.
- Never build keys into images.
- Rotate provider keys.
- Separate staging and production credentials.
# Schema migrations

The API never creates tables at application startup. Before starting an API process, run `alembic upgrade head` from `starter/backend`; the container command performs this step before starting Uvicorn. Deployments must run migrations as a single controlled operation before scaling API replicas.
