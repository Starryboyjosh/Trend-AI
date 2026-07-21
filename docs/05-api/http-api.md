---
id: API-HTTP-001
kind: api_spec
status: accepted
related: [ARCH-BACKEND-001]
---

# HTTP API

Base path: `/api/v1`

## Conventions

- JSON request and response bodies.
- UUID-like opaque IDs.
- ISO 8601 timestamps in UTC.
- Cursor pagination for conversations, projects, and assets.
- Stable error envelope.
- Idempotency key for generation and upload finalization.

## Identity

### `POST /auth/login`

Authenticate and set secure session cookie.

### `POST /auth/logout`

Invalidate current session.

### `GET /me`

Return user and workspace summary.

## Business profile

### `POST /businesses`

Creates a business from onboarding.

### `GET /businesses/{business_id}`

Returns authorized business details.

### `PATCH /businesses/{business_id}`

Partial update with optimistic version field.

### `PUT /businesses/{business_id}/brand-profile`

Create or replace approved brand profile version.

## Conversations

### `POST /conversations`

```json
{
  "business_id": "biz_123",
  "title": "Promoción bebida fría"
}
```

### `GET /conversations`

Filters: business, cursor, search, archived.

### `GET /conversations/{conversation_id}`

Returns thread metadata and paginated messages.

### `POST /conversations/{conversation_id}/messages`

```json
{
  "text": "Quiero promocionar una bebida fría esta semana",
  "ui_intent": "create_social_post",
  "platform": "instagram",
  "tone": "juvenil",
  "attachment_ids": []
}
```

Response may be a clarification or a completed artifact.

## Generation

### `POST /artifacts/{artifact_id}/variations`

```json
{
  "transformation": "more_youthful",
  "notes": "Mantén el llamado a visitar el local"
}
```

### `PATCH /artifacts/{artifact_id}/versions/{version_id}`

Persist user edits.

## Projects

### `POST /projects`

Create from artifact or template.

### `GET /projects`

List active or archived projects.

### `GET /projects/{project_id}`

Project with current artifact and version summary.

### `PATCH /projects/{project_id}`

Rename, archive, or update metadata.

## Templates

### `GET /templates`

Filters: platform, format, category, objective, search.

### `GET /templates/{template_id}`

Returns preview and editable slots.

## Assets

### `POST /assets/uploads`

Request upload session and signed target.

### `POST /assets/uploads/{upload_id}/complete`

Finalize and validate uploaded object.

### `POST /assets/{asset_id}/analyses`

Run visual review.

### `GET /assets`

List authorized library assets.

## Feedback

### `POST /artifacts/{artifact_id}/feedback`

```json
{
  "rating": "useful",
  "reason": null
}
```
