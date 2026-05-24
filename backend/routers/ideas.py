"""
routers/ideas.py
GET    /api/ideas        — list ideas
POST   /api/ideas        — create idea
POST   /api/ideas/{id}/expand — AI expand idea
PATCH  /api/ideas/{id}   — update idea status
DELETE /api/ideas/{id}   — delete idea
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db, Idea
from services import ai_service

router = APIRouter()


class IdeaCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    status: Optional[str] = "concept"


class IdeaUpdate(BaseModel):
    status: Optional[str] = None
    category: Optional[str] = None


@router.get("/")
async def list_ideas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Idea).order_by(Idea.created_at.desc()))
    ideas = result.scalars().all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "description": i.description,
            "category": i.category,
            "status": i.status,
            "expanded": i.expanded,
            "created_at": i.created_at.isoformat(),
        }
        for i in ideas
    ]


@router.post("/")
async def create_idea(req: IdeaCreate, db: AsyncSession = Depends(get_db)):
    idea = Idea(
        title=req.title,
        description=req.description,
        category=req.category,
        status=req.status,
    )
    db.add(idea)
    await db.flush()
    await db.refresh(idea)
    return {"id": idea.id, "title": idea.title, "status": idea.status}


@router.post("/{idea_id}/expand")
async def expand_idea(idea_id: int, db: AsyncSession = Depends(get_db)):
    """AI-expand an idea into a full startup analysis."""
    idea = await db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    expansion_text = await ai_service.expand_idea(idea.title, idea.description or "")
    idea.expanded = {"text": expansion_text}
    await db.flush()

    return {"id": idea.id, "title": idea.title, "expansion": expansion_text}


@router.patch("/{idea_id}")
async def update_idea(idea_id: int, req: IdeaUpdate, db: AsyncSession = Depends(get_db)):
    idea = await db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    if req.status:
        idea.status = req.status
    if req.category:
        idea.category = req.category
    await db.flush()
    return {"id": idea.id, "status": idea.status}


@router.delete("/{idea_id}")
async def delete_idea(idea_id: int, db: AsyncSession = Depends(get_db)):
    idea = await db.get(Idea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    await db.delete(idea)
    return {"message": "Deleted"}
