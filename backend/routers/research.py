"""
routers/research.py
POST /api/research — research a topic via AI
"""

from fastapi import APIRouter
from pydantic import BaseModel
from services import ai_service

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str


@router.post("/")
async def research(req: ResearchRequest):
    result = await ai_service.research_topic(req.query)
    return {"query": req.query, "result": result}
