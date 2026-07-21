from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError, ForbiddenError
from app.dependencies import CurrentPrincipal, get_current_principal, get_db
from app.identity.models import AuthSession, User, Workspace, WorkspaceMember

router = APIRouter(prefix="/auth", tags=["identity"])


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_hex, digest_hex = encoded.split("$", 2)
        candidate = _hash_password(password, bytes.fromhex(salt_hex))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(candidate, encoded)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=256)
    workspace_name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=256)


async def _create_session(db: AsyncSession, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            token_hash=_token_hash(token),
            user_id=user_id,
            expires_at=datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours),
        )
    )
    await db.flush()
    return token


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )


@router.post("/register", status_code=201)
async def register(
    body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> dict:
    email = body.email.casefold().strip()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise AppError("EMAIL_IN_USE", "No se pudo crear la cuenta.", status_code=409)
    user = User(email=email, name=body.name.strip(), password_hash=_hash_password(body.password))
    workspace = Workspace(name=body.workspace_name.strip())
    db.add_all([user, workspace])
    await db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    token = await _create_session(db, user.id)
    await db.commit()
    _set_session_cookie(response, token)
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "workspace": {"id": workspace.id, "name": workspace.name, "role": "owner"},
    }


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(select(User).where(User.email == body.email.casefold().strip()))
    user = result.scalar_one_or_none()
    if user is None or not _verify_password(body.password, user.password_hash):
        raise ForbiddenError("Credenciales inválidas.")
    token = await _create_session(db, user.id)
    await db.commit()
    _set_session_cookie(response, token)
    return {"user": {"id": user.id, "name": user.name, "email": user.email}}


@router.post("/logout", status_code=204)
async def logout(
    principal: CurrentPrincipal = Depends(get_current_principal),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await db.execute(delete(AuthSession).where(AuthSession.id == principal.session.id))
    await db.commit()
    response = Response(status_code=204)
    response.delete_cookie(settings.session_cookie_name, path="/")
    return response


@router.get("/me")
async def me(principal: CurrentPrincipal = Depends(get_current_principal)) -> dict:
    return {"user": principal.user, "workspaces": principal.workspaces}
