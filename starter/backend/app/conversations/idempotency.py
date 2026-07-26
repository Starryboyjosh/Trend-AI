from __future__ import annotations

import json
from hashlib import sha256

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversations.models import IdempotencyRecord
from app.core.errors import ConflictError


def payload_fingerprint(payload: dict) -> str:
    return sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


async def reserve(
    db: AsyncSession,
    *,
    workspace_id: str,
    endpoint: str,
    key: str | None,
    payload_hash: str,
) -> IdempotencyRecord | None:
    if not key:
        return None
    existing = await db.execute(
        select(IdempotencyRecord).where(
            IdempotencyRecord.workspace_id == workspace_id,
            IdempotencyRecord.endpoint == endpoint,
            IdempotencyRecord.key == key,
        )
    )
    record = existing.scalar_one_or_none()
    if record is not None:
        if record.payload_hash != payload_hash:
            raise ConflictError("La clave de idempotencia ya se utilizó con una solicitud diferente.")
        if record.status == "completed" and record.response_json:
            return record
        if record.status == "processing":
            raise ConflictError(
                "La solicitud ya está en proceso. Inténtalo nuevamente en un momento.",
                retryable=True,
            )
        record.status = "processing"
        record.response_json = None
        await db.commit()
        return record
    record = IdempotencyRecord(
        workspace_id=workspace_id,
        endpoint=endpoint,
        key=key,
        payload_hash=payload_hash,
        status="processing",
    )
    db.add(record)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return await reserve(
            db,
            workspace_id=workspace_id,
            endpoint=endpoint,
            key=key,
            payload_hash=payload_hash,
        )
    return record


async def mark_failed(
    db: AsyncSession, *, workspace_id: str, endpoint: str, key: str | None
) -> None:
    if not key:
        return
    result = await db.execute(
        select(IdempotencyRecord).where(
            IdempotencyRecord.workspace_id == workspace_id,
            IdempotencyRecord.endpoint == endpoint,
            IdempotencyRecord.key == key,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.status = "failed"
        await db.commit()


async def complete(
    db: AsyncSession, record: IdempotencyRecord | None, response: dict
) -> dict:
    if record:
        record.status = "completed"
        record.response_json = json.dumps(response, ensure_ascii=False)
        await db.commit()
    return response
