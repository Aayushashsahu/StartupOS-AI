"""
routers/dashboard.py — Dashboard stats endpoint
GET /api/dashboard/stats — aggregated counts for the dashboard
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db, Meeting, ContentHistory, Idea, Task

router = APIRouter()


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Return aggregated counts for all modules."""
    meetings_count = await db.scalar(select(func.count()).select_from(Meeting))
    content_count = await db.scalar(select(func.count()).select_from(ContentHistory))
    ideas_count = await db.scalar(select(func.count()).select_from(Idea))
    tasks_count = await db.scalar(
        select(func.count()).select_from(Task).where(Task.status != "done")
    )

    return {
        "meetings_summarized": meetings_count or 0,
        "content_generated": content_count or 0,
        "ideas_saved": ideas_count or 0,
        "tasks_active": tasks_count or 0,
    }
