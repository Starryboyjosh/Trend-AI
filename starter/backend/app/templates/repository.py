from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.templates.models import Template


def _serialize(items: list[str]) -> str:
    return json.dumps(items)


def _deserialize(raw: str) -> list[str]:
    return json.loads(raw) if raw else []


SEED_TEMPLATES: list[dict] = [
    {
        "id": "tpl_reel_01",
        "title": "Reel promocional",
        "platforms": ["instagram", "tiktok"],
        "formats": ["reel", "short_video"],
        "category": "promotion",
        "objective": "sales",
        "thumbnail_url": "/static/thumbnails/reel-promo.svg",
        "editable_slots": ["title_text", "caption", "cta"],
        "description": "Video corto presentando un producto nuevo.",
    },
    {
        "id": "tpl_static_01",
        "title": "Publicación estática",
        "platforms": ["instagram", "facebook"],
        "formats": ["static_post", "carousel"],
        "category": "promotion",
        "objective": "engagement",
        "thumbnail_url": "/static/thumbnails/static-post.svg",
        "editable_slots": ["headline", "body", "cta", "hashtags"],
        "description": "Publicación con imagen principal y texto descriptivo.",
    },
    {
        "id": "tpl_story_01",
        "title": "Historia de producto",
        "platforms": ["instagram", "facebook"],
        "formats": ["story"],
        "category": "awareness",
        "objective": "brand_awareness",
        "thumbnail_url": "/static/thumbnails/story-product.svg",
        "editable_slots": ["caption", "cta"],
        "description": "Historia efímera destacando un producto o servicio.",
    },
    {
        "id": "tpl_video_01",
        "title": "Video testimonial",
        "platforms": ["tiktok", "instagram", "youtube"],
        "formats": ["short_video", "reel"],
        "category": "social_proof",
        "objective": "community",
        "thumbnail_url": "/static/thumbnails/video-testimonial.svg",
        "editable_slots": ["intro", "question", "cta"],
        "description": "Formato de entrevista rápida con un cliente satisfecho.",
    },
    {
        "id": "tpl_carousel_01",
        "title": "Carrusel educativo",
        "platforms": ["instagram", "linkedin", "facebook"],
        "formats": ["carousel"],
        "category": "education",
        "objective": "engagement",
        "thumbnail_url": "/static/thumbnails/carousel-edu.svg",
        "editable_slots": ["slide_1", "slide_2", "slide_3", "cta"],
        "description": "Carrusel de 3 diapositivas explicando un concepto.",
    },
    {
        "id": "tpl_whatsapp_01",
        "title": "Oferta por WhatsApp",
        "platforms": ["whatsapp"],
        "formats": ["static_post"],
        "category": "promotion",
        "objective": "sales",
        "thumbnail_url": "/static/thumbnails/whatsapp-offer.svg",
        "editable_slots": ["greeting", "offer", "cta"],
        "description": "Mensaje promocional optimizado para WhatsApp.",
    },
    {
        "id": "tpl_launch_01",
        "title": "Lanzamiento de producto",
        "platforms": ["instagram", "tiktok", "facebook"],
        "formats": ["reel", "static_post", "story"],
        "category": "launch",
        "objective": "launch",
        "thumbnail_url": "/static/thumbnails/launch-product.svg",
        "editable_slots": ["announcement", "details", "cta"],
        "description": "Anuncio de lanzamiento con entusiasmo y detalles clave.",
    },
    {
        "id": "tpl_event_01",
        "title": "Invitación a evento",
        "platforms": ["instagram", "facebook"],
        "formats": ["static_post", "story"],
        "category": "events",
        "objective": "store_visits",
        "thumbnail_url": "/static/thumbnails/event-invite.svg",
        "editable_slots": ["title", "date", "location", "cta"],
        "description": "Invitación visual para un evento presencial o virtual.",
    },
]


def template_to_dict(t: Template) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "platforms": _deserialize(t.platforms),
        "formats": _deserialize(t.formats),
        "category": t.category,
        "objective": t.objective,
        "thumbnail_url": t.thumbnail_url,
        "editable_slots": _deserialize(t.editable_slots),
        "description": t.description,
    }


async def seed_templates(db: AsyncSession) -> None:
    result = await db.execute(select(Template).limit(1))
    if result.scalar_one_or_none() is not None:
        return
    for data in SEED_TEMPLATES:
        template = Template(
            id=data["id"],
            title=data["title"],
            platforms=_serialize(data["platforms"]),
            formats=_serialize(data["formats"]),
            category=data["category"],
            objective=data["objective"],
            thumbnail_url=data["thumbnail_url"],
            editable_slots=_serialize(data["editable_slots"]),
            description=data.get("description"),
        )
        db.add(template)
    await db.commit()


async def list_templates(
    db: AsyncSession,
    *,
    platform: str | None = None,
    format: str | None = None,
    category: str | None = None,
    objective: str | None = None,
    search: str | None = None,
) -> list[dict]:
    query = select(Template)
    if platform:
        query = query.where(Template.platforms.contains(platform))
    if format:
        query = query.where(Template.formats.contains(format))
    if category:
        query = query.where(Template.category == category)
    if objective:
        query = query.where(Template.objective == objective)
    if search:
        query = query.where(Template.title.ilike(f"%{search}%"))
    result = await db.execute(query)
    return [template_to_dict(t) for t in result.scalars().all()]


async def get_template(db: AsyncSession, template_id: str) -> dict:
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundError("Plantilla")
    return template_to_dict(template)
