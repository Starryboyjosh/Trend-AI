from __future__ import annotations

from fastapi import Header

from app.core.errors import ForbiddenError
from app.db.session import get_db as _get_db

WORKSPACE_HEADER = "X-Workspace-Id"


async def get_db():
    async for session in _get_db():
        yield session


async def require_workspace(
    x_workspace_id: str = Header(..., alias=WORKSPACE_HEADER),
) -> str:
    if not x_workspace_id or len(x_workspace_id) < 8:
        raise ForbiddenError()
    return x_workspace_id
