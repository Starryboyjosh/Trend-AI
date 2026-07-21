from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.business.models import Business
from app.conversations.models import ArtifactVersion, Conversation, GeneratedArtifact
from app.conversations.repository import SqlArtifactRepository
from app.core.errors import NotFoundError, ValidationError_
from app.dependencies import get_db, require_workspace
from app.domain.models import GeneratedSocialPost
from app.projects.models import Project
from app.templates.repository import get_template

router = APIRouter(prefix="/projects", tags=["projects"])


class CreateProjectRequest(BaseModel):
    artifact_id: str | None = Field(None, min_length=1)
    template_id: str | None = Field(None, min_length=1)
    name: str | None = Field(None, max_length=240)
    business_id: str | None = Field(None, min_length=1)


class UpdateProjectRequest(BaseModel):
    name: str | None = Field(None, max_length=240)
    status: str | None = None


def project_to_dict(p: Project) -> dict:
    return {
        "id": p.id,
        "workspace_id": p.workspace_id,
        "business_id": p.business_id,
        "name": p.name,
        "artifact_id": p.artifact_id,
        "platform": p.platform,
        "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _load_artifact_content_json(snapshot: str | None) -> dict | None:
    if snapshot is None:
        return None
    try:
        return json.loads(snapshot)
    except (json.JSONDecodeError, TypeError):
        return None


@router.post("", status_code=201)
async def create_project_endpoint(
    body: CreateProjectRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    content: dict | None = None
    artifact_id: str | None = None
    platform: str = "instagram"
    business_id: str | None = body.business_id

    if body.template_id:
        if business_id is None:
            raise ValidationError_("Selecciona el negocio para el proyecto.")
        business_result = await db.execute(
            select(Business.id).where(
                Business.id == business_id, Business.workspace_id == workspace_id
            )
        )
        if business_result.scalar_one_or_none() is None:
            raise NotFoundError("Negocio")
        template_data = await get_template(db, body.template_id)
        platform = template_data["platforms"][0] if template_data["platforms"] else "instagram"
        title = body.name or template_data["title"]
        content = {
            "hook": title,
            "caption": "",
            "call_to_action": "",
            "hashtags": [],
            "visual_direction": "",
            "format_recommendation": template_data["formats"][0]
            if template_data["formats"]
            else "static_post",
            "platform": platform,
            "artifact_type": "social_post",
            "template_id": body.template_id,
        }
    elif body.artifact_id:
        artifact_result = await db.execute(
            select(GeneratedArtifact, Conversation)
            .join(Conversation, Conversation.id == GeneratedArtifact.conversation_id)
            .where(
                GeneratedArtifact.id == body.artifact_id,
                Conversation.workspace_id == workspace_id,
            )
        )
        row = artifact_result.one_or_none()
        if row is None:
            raise NotFoundError("Artículo")
        artifact, conv = row
        business_id = conv.business_id
        platform = artifact.platform

        version_result = await db.execute(
            select(ArtifactVersion)
            .where(ArtifactVersion.artifact_id == artifact.id)
            .order_by(ArtifactVersion.version_number.desc())
            .limit(1)
        )
        version = version_result.scalar_one_or_none()
        content = json.loads(version.content_json) if version else None
        artifact_id = artifact.id
        title = body.name or (content.get("hook", "")[:100] if content else "")
    else:
        raise NotFoundError("Artículo o plantilla")

    if not title:
        title = "Proyecto sin título"

    project = Project(
        workspace_id=workspace_id,
        business_id=business_id,
        name=title,
        artifact_id=artifact_id,
        platform=platform,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    if artifact_id:
        artifact_result = await db.execute(
            select(GeneratedArtifact).where(GeneratedArtifact.id == artifact_id)
        )
        art = artifact_result.scalar_one_or_none()
        if art:
            art.project_id = project.id

    await db.commit()

    result = project_to_dict(project)
    result["artifact_snapshot"] = content
    return result


@router.get("")
async def list_projects_endpoint(
    status: str | None = None,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = select(Project).where(Project.workspace_id == workspace_id)
    if status:
        query = query.where(Project.status == status)
    query = query.order_by(Project.updated_at.desc()).limit(20)
    result = await db.execute(query)
    projects = result.scalars().all()

    output = []
    for p in projects:
        data = project_to_dict(p)
        if p.artifact_id:
            version_result = await db.execute(
                select(ArtifactVersion)
                .where(ArtifactVersion.artifact_id == p.artifact_id)
                .order_by(ArtifactVersion.version_number.desc())
                .limit(1)
            )
            version = version_result.scalar_one_or_none()
            content: dict | None = json.loads(version.content_json) if version else None
            data["artifact_snapshot"] = content
        output.append(data)
    return output


@router.get("/{project_id}")
async def get_project_endpoint(
    project_id: str,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise NotFoundError("Proyecto")

    data = project_to_dict(project)

    if project.artifact_id:
        version_result = await db.execute(
            select(ArtifactVersion)
            .where(ArtifactVersion.artifact_id == project.artifact_id)
            .order_by(ArtifactVersion.version_number.desc())
            .limit(1)
        )
        version = version_result.scalar_one_or_none()
        content: dict | None = json.loads(version.content_json) if version else None
        data["artifact_snapshot"] = content

    return data


@router.patch("/{project_id}")
async def update_project_endpoint(
    project_id: str,
    body: UpdateProjectRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise NotFoundError("Proyecto")

    if body.name is not None:
        project.name = body.name
    if body.status is not None:
        project.status = body.status

    await db.commit()
    await db.refresh(project)
    return project_to_dict(project)


class UpdateArtifactVersionRequest(BaseModel):
    hook: str = Field(min_length=1, max_length=180)
    caption: str = Field(min_length=1, max_length=2200)
    call_to_action: str = Field(max_length=240)
    hashtags: list[str] = Field(max_length=5)
    visual_direction: str = Field(min_length=1, max_length=700)
    format_recommendation: str


@router.put("/{project_id}/artifact-version")
async def update_artifact_version_endpoint(
    project_id: str,
    body: UpdateArtifactVersionRequest,
    workspace_id: str = Depends(require_workspace),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise NotFoundError("Proyecto")
    if not project.artifact_id:
        raise NotFoundError("Artículo")

    art_result = await db.execute(
        select(GeneratedArtifact, Conversation)
        .join(Conversation, Conversation.id == GeneratedArtifact.conversation_id)
        .where(
            GeneratedArtifact.id == project.artifact_id,
            Conversation.workspace_id == workspace_id,
        )
    )
    row = art_result.one_or_none()
    if row is None:
        raise NotFoundError("Artículo")
    artifact_record, _ = row

    version_result = await db.execute(
        select(ArtifactVersion)
        .where(ArtifactVersion.artifact_id == project.artifact_id)
        .order_by(ArtifactVersion.version_number.desc())
        .limit(1)
    )
    current_version = version_result.scalar_one_or_none()

    post = GeneratedSocialPost(
        platform=artifact_record.platform,
        hook=body.hook,
        caption=body.caption,
        call_to_action=body.call_to_action,
        hashtags=body.hashtags,
        visual_direction=body.visual_direction,
        format_recommendation=body.format_recommendation,
    )

    repo = SqlArtifactRepository(db)
    await repo.add_artifact_version(
        artifact_id=project.artifact_id,
        content=post,
        user_edited=True,
        parent_version_id=current_version.id if current_version else None,
    )
    await db.commit()

    return {
        "version": post.model_dump(),
        "version_number": (current_version.version_number + 1) if current_version else 1,
    }
