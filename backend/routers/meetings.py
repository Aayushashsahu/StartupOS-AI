"""
routers/meetings.py
POST /api/meetings/summarize — AI summarize transcript
GET  /api/meetings          — list past meetings
GET  /api/meetings/{id}     — get one meeting
DELETE /api/meetings/{id}   — delete meeting
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import get_db, Meeting
from services import ai_service

router = APIRouter()


class SummarizeRequest(BaseModel):
    title: str = "Meeting Notes"
    transcript: str


@router.post("/summarize")
async def summarize_meeting(req: SummarizeRequest, db: AsyncSession = Depends(get_db)):
    """Summarize a meeting transcript using AI."""
    result = await ai_service.summarize_meeting(req.transcript)

    # Persist to database
    meeting = Meeting(
        title=req.title,
        raw_text=req.transcript,
        summary=result.get("summary", ""),
        key_points=result.get("key_points", []),
        action_items=result.get("action_items", []),
        follow_up_email=result.get("follow_up_email", ""),
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)

    return {
        "id": meeting.id,
        "title": meeting.title,
        "summary": meeting.summary,
        "key_points": meeting.key_points,
        "action_items": meeting.action_items,
        "follow_up_email": meeting.follow_up_email,
        "created_at": meeting.created_at.isoformat(),
    }


@router.get("/")
async def list_meetings(db: AsyncSession = Depends(get_db)):
    """List all past meetings, newest first."""
    result = await db.execute(select(Meeting).order_by(Meeting.created_at.desc()))
    meetings = result.scalars().all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "summary": m.summary,
            "created_at": m.created_at.isoformat(),
        }
        for m in meetings
    ]


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: int, db: AsyncSession = Depends(get_db)):
    meeting = await db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {
        "id": meeting.id,
        "title": meeting.title,
        "raw_text": meeting.raw_text,
        "summary": meeting.summary,
        "key_points": meeting.key_points,
        "action_items": meeting.action_items,
        "follow_up_email": meeting.follow_up_email,
        "created_at": meeting.created_at.isoformat(),
    }


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: int, db: AsyncSession = Depends(get_db)):
    meeting = await db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await db.delete(meeting)
    return {"message": "Deleted"}
