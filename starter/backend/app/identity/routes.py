from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Cookie, Depends, Header, Response
from pydantic import BaseModel, Field, ValidationError, model_validator
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.business.repository import (
    brand_profile_to_dict,
    business_to_dict,
    create_business,
    upsert_brand_profile,
)
from app.core.config import settings
from app.core.errors import AppError, ForbiddenError
from app.dependencies import CurrentPrincipal, get_current_principal, get_db
from app.domain.models import Category, Objective, Platform, Tone
from app.identity.models import (
    AuthSession,
    PendingSignup,
    User,
    UserPreference,
    Workspace,
    WorkspaceMember,
)

router = APIRouter(prefix="/auth", tags=["identity"])

SIGNUP_COOKIE_NAME = "hitrendy_signup"
SIGNUP_TTL = timedelta(hours=24)
SignupStep = Literal["business", "channels", "brand", "review"]
InterfaceLocale = Literal["es", "en", "pt"]


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_hex, _ = encoded.split("$", 2)
        candidate = _hash_password(password, bytes.fromhex(salt_hex))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(candidate, encoded)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _datetime_is_expired(value: datetime) -> bool:
    expires_at = value if value.tzinfo else value.replace(tzinfo=UTC)
    return expires_at <= datetime.now(UTC)


def _load_draft(pending: PendingSignup) -> dict[str, object]:
    try:
        payload = json.loads(pending.draft_json)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _current_signup_step(draft: dict[str, object]) -> SignupStep:
    if "business" not in draft:
        return "business"
    if "channels" not in draft:
        return "channels"
    if "brand" not in draft:
        return "brand"
    return "review"


def _signup_response(pending: PendingSignup) -> dict[str, object]:
    return {
        "signup": {
            "status": "completed" if pending.completed_at else "pending",
            "current_step": pending.current_step,
            "expires_at": pending.expires_at.isoformat(),
            "updated_at": pending.updated_at.isoformat() if pending.updated_at else None,
            "version": pending.version,
            "draft": _load_draft(pending),
        }
    }


async def _create_session(db: AsyncSession, user_id: str) -> str:
    await db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
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
        samesite="strict",
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )


def _set_signup_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SIGNUP_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="strict",
        max_age=int(SIGNUP_TTL.total_seconds()),
        path="/",
    )


def _clear_signup_cookie(response: Response) -> None:
    response.delete_cookie(SIGNUP_COOKIE_NAME, path="/")


async def _get_pending_signup(
    db: AsyncSession,
    token: str | None,
    *,
    lock: bool = False,
) -> PendingSignup:
    if not token:
        raise AppError("SIGNUP_NOT_FOUND", "No encontramos un registro pendiente.", status_code=404)
    statement = select(PendingSignup).where(PendingSignup.token_hash == _token_hash(token))
    if lock:
        statement = statement.with_for_update()
    pending = (await db.execute(statement)).scalar_one_or_none()
    if pending is None:
        raise AppError("SIGNUP_NOT_FOUND", "No encontramos un registro pendiente.", status_code=404)
    if pending.completed_at is None and _datetime_is_expired(pending.expires_at):
        await db.delete(pending)
        await db.commit()
        raise AppError("SIGNUP_EXPIRED", "El registro pendiente expiró.", status_code=410)
    return pending


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=256)
    workspace_name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=256)


class SignupStartRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=256)
    interface_locale: InterfaceLocale = "es"


class SignupBusinessDraft(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: Category
    country: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=1, max_length=100)
    description: str | None = Field(None, max_length=1000)
    primary_product: str = Field(min_length=1, max_length=240)
    target_audience: str = Field(min_length=1, max_length=500)
    website_url: str | None = Field(None, max_length=500)


class SignupChannelsDraft(BaseModel):
    preferred_platforms: list[Platform] = Field(min_length=1)
    primary_objective: Objective


class SignupBrandDraft(BaseModel):
    voice_tones: list[Tone] = Field(min_length=1, max_length=3)
    value_proposition: str = Field(min_length=1, max_length=500)
    preferred_words: list[str] = Field(default_factory=list, max_length=30)
    forbidden_words: list[str] = Field(default_factory=list, max_length=30)
    primary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    content_locale: InterfaceLocale = "es"


class SignupReviewDraft(BaseModel):
    confirmed: bool


class SignupDraftRequest(BaseModel):
    step: SignupStep
    expected_version: int = Field(ge=1)
    business: SignupBusinessDraft | None = None
    channels: SignupChannelsDraft | None = None
    brand: SignupBrandDraft | None = None
    review: SignupReviewDraft | None = None

    @model_validator(mode="after")
    def validate_step_payload(self) -> SignupDraftRequest:
        payloads = {
            "business": self.business,
            "channels": self.channels,
            "brand": self.brand,
            "review": self.review,
        }
        if payloads[self.step] is None or sum(value is not None for value in payloads.values()) != 1:
            raise ValueError("El borrador debe incluir únicamente los datos del paso indicado.")
        return self


@router.post("/register", status_code=201, deprecated=True)
async def register(
    body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)
) -> dict[str, object]:
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


@router.post("/signup/start", status_code=201)
async def start_signup(
    body: SignupStartRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    now = datetime.now(UTC)
    email = body.email.casefold().strip()
    await db.execute(
        delete(PendingSignup).where(
            PendingSignup.completed_at.is_(None), PendingSignup.expires_at <= now
        )
    )
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none() is not None:
        await db.rollback()
        raise AppError("EMAIL_IN_USE", "No se pudo crear la cuenta.", status_code=409)
    if (
        await db.execute(select(PendingSignup).where(PendingSignup.email_normalized == email))
    ).scalar_one_or_none() is not None:
        await db.rollback()
        raise AppError("EMAIL_IN_USE", "No se pudo crear la cuenta.", status_code=409)
    token = secrets.token_urlsafe(32)
    pending = PendingSignup(
        email_normalized=email,
        name=body.name.strip(),
        password_hash=_hash_password(body.password),
        interface_locale=body.interface_locale,
        token_hash=_token_hash(token),
        expires_at=now + SIGNUP_TTL,
    )
    db.add(pending)
    await db.commit()
    await db.refresh(pending)
    _set_signup_cookie(response, token)
    return _signup_response(pending)


@router.get("/signup")
async def get_signup(
    signup_token: str | None = Cookie(None, alias=SIGNUP_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    pending = await _get_pending_signup(db, signup_token)
    return _signup_response(pending)


@router.patch("/signup")
async def save_signup_draft(
    body: SignupDraftRequest,
    signup_token: str | None = Cookie(None, alias=SIGNUP_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    pending = await _get_pending_signup(db, signup_token)
    if pending.completed_at is not None:
        raise AppError("SIGNUP_CONFLICT", "El registro ya fue completado.", status_code=409)
    draft = _load_draft(pending)
    payload = getattr(body, body.step)
    assert payload is not None
    proposed_draft = {**draft, body.step: payload.model_dump(exclude_none=True)}
    if body.expected_version != pending.version:
        if proposed_draft == draft:
            return _signup_response(pending)
        raise AppError("SIGNUP_CONFLICT", "El borrador fue actualizado en otra sesión.", status_code=409)
    required_step = _current_signup_step(draft)
    order = {"business": 0, "channels": 1, "brand": 2, "review": 3}
    if order[body.step] > order[required_step]:
        raise AppError("SIGNUP_INCOMPLETE", "Completa los pasos anteriores.", status_code=422)
    pending.draft_json = json.dumps(proposed_draft, ensure_ascii=False, sort_keys=True)
    pending.current_step = _current_signup_step(proposed_draft)
    pending.version += 1
    await db.commit()
    await db.refresh(pending)
    return _signup_response(pending)


@router.delete("/signup", status_code=204)
async def cancel_signup(
    response: Response,
    signup_token: str | None = Cookie(None, alias=SIGNUP_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> Response:
    pending = await _get_pending_signup(db, signup_token)
    if pending.completed_at is not None:
        raise AppError("SIGNUP_CONFLICT", "El registro ya fue completado.", status_code=409)
    await db.delete(pending)
    await db.commit()
    _clear_signup_cookie(response)
    return Response(status_code=204, headers=response.headers)


def _validated_complete_draft(
    draft: dict[str, object],
) -> tuple[SignupBusinessDraft, SignupChannelsDraft, SignupBrandDraft]:
    try:
        business = SignupBusinessDraft.model_validate(draft.get("business"))
        channels = SignupChannelsDraft.model_validate(draft.get("channels"))
        brand = SignupBrandDraft.model_validate(draft.get("brand"))
        review = SignupReviewDraft.model_validate(draft.get("review"))
    except ValidationError as exc:
        raise AppError("SIGNUP_INCOMPLETE", "Completa todos los pasos del registro.", 422) from exc
    if not review.confirmed:
        raise AppError("SIGNUP_INCOMPLETE", "Confirma los datos antes de continuar.", 422)
    return business, channels, brand


@router.post("/signup/complete")
async def complete_signup(
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=1, max_length=255),
    signup_token: str | None = Cookie(None, alias=SIGNUP_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    pending = await _get_pending_signup(db, signup_token, lock=True)
    if pending.completed_at is not None:
        if pending.completion_idempotency_key == idempotency_key:
            return json.loads(pending.completion_response_json or "{}")
        raise AppError("SIGNUP_CONFLICT", "El registro ya fue completado.", status_code=409)
    business_draft, channels_draft, brand_draft = _validated_complete_draft(_load_draft(pending))
    try:
        existing = await db.execute(select(User).where(User.email == pending.email_normalized))
        if existing.scalar_one_or_none() is not None:
            raise AppError("EMAIL_IN_USE", "No se pudo crear la cuenta.", status_code=409)
        user = User(
            email=pending.email_normalized,
            name=pending.name,
            password_hash=pending.password_hash or "",
            interface_locale=pending.interface_locale,
            status="active",
        )
        workspace = Workspace(name=business_draft.name)
        db.add_all([user, workspace])
        await db.flush()
        db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
        business_data = business_draft.model_dump(exclude_none=True) | channels_draft.model_dump()
        business_data["content_locale"] = brand_draft.content_locale
        business_data["onboarding_completed_at"] = datetime.now(UTC)
        business = await create_business(db, workspace.id, business_data)
        profile = await upsert_brand_profile(
            db,
            workspace.id,
            business.id,
            brand_draft.model_dump(exclude={"content_locale"}),
        )
        db.add(UserPreference(user_id=user.id, interface_locale=pending.interface_locale))
        session_token = await _create_session(db, user.id)
        result: dict[str, object] = {
            "user": {"id": user.id, "name": user.name, "email": user.email},
            "workspace": {"id": workspace.id, "name": workspace.name, "role": "owner"},
            "business": business_to_dict(business),
            "brand_profile": brand_profile_to_dict(profile),
        }
        pending.completed_at = datetime.now(UTC)
        pending.current_step = "completed"
        pending.completion_idempotency_key = idempotency_key
        pending.completion_response_json = json.dumps(result, ensure_ascii=False, sort_keys=True)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppError("EMAIL_IN_USE", "No se pudo crear la cuenta.", status_code=409) from exc
    except Exception:
        await db.rollback()
        raise
    _set_session_cookie(response, session_token)
    _clear_signup_cookie(response)
    return result


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(
        select(User).where(User.email == body.email.casefold().strip(), User.status == "active")
    )
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
