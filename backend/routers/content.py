"""
routers/content.py
POST /api/content/generate — generate content via AI
GET  /api/content/history  — list past generations
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db, ContentHistory
from services import ai_service

router = APIRouter()


class ContentRequest(BaseModel):
    topic: str
    platform: str = "linkedin"   # linkedin | twitter | blog | email | announcement
    tone: str = "thought-leadership"
    audience: str = "startup founders"


@router.post("/generate")
async def generate_content(req: ContentRequest, db: AsyncSession = Depends(get_db)):
    """Generate platform-specific content using AI."""
    generated = await ai_service.generate_content(
        topic=req.topic,
        platform=req.platform,
        tone=req.tone,
        audience=req.audience,
    )

    # Save to history
    record = ContentHistory(
        topic=req.topic,
        platform=req.platform,
        tone=req.tone,
        audience=req.audience,
        generated_text=generated,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    return {
        "id": record.id,
        "topic": record.topic,
        "platform": record.platform,
        "generated_text": record.generated_text,
        "created_at": record.created_at.isoformat(),
    }


@router.get("/history")
async def content_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContentHistory).order_by(ContentHistory.created_at.desc()).limit(50)
    )
    items = result.scalars().all()
    return [
        {
            "id": i.id,
            "topic": i.topic,
            "platform": i.platform,
            "tone": i.tone,
            "generated_text": i.generated_text[:200] + "...",
            "created_at": i.created_at.isoformat(),
        }
        for i in items
    ]
