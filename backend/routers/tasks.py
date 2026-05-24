"""
routers/tasks.py
POST  /api/tasks/plan   — AI generate task plan from goal
GET   /api/tasks        — list all tasks
POST  /api/tasks        — create a task manually
PATCH /api/tasks/{id}   — update task status/priority
DELETE /api/tasks/{id}  — delete task
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db, Task, TaskPlan
from services import ai_service

router = APIRouter()


class PlanRequest(BaseModel):
    goal: str
    timeline_days: int = 30


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    milestone: Optional[str] = ""
    source: Optional[str] = "manual"


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None


@router.post("/plan")
async def generate_plan(req: PlanRequest, db: AsyncSession = Depends(get_db)):
    """Generate a task plan from a high-level goal using AI."""
    plan_text = await ai_service.plan_tasks(req.goal, req.timeline_days)

    # Save the plan
    plan = TaskPlan(
        goal=req.goal,
        timeline_days=req.timeline_days,
        milestones=[],
    )
    db.add(plan)
    await db.flush()
    await db.refresh(plan)

    # Auto-extract and create tasks from the plan text
    lines = [l.strip() for l in plan_text.split("\n") if l.strip().startswith("-")]
    created_tasks = []
    for i, line in enumerate(lines[:8]):
        title = line.lstrip("- ").strip()[:200]
        if title:
            task = Task(
                title=title,
                priority="high" if i < 2 else "medium",
                status="todo",
                plan_id=plan.id,
                source="agent",
            )
            db.add(task)
            created_tasks.append(title)

    await db.flush()

    return {
        "plan_id": plan.id,
        "goal": req.goal,
        "plan_text": plan_text,
        "tasks_created": len(created_tasks),
    }


@router.get("/")
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    tasks = result.scalars().all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "milestone": t.milestone,
            "priority": t.priority,
            "status": t.status,
            "source": t.source,
            "plan_id": t.plan_id,
            "created_at": t.created_at.isoformat(),
        }
        for t in tasks
    ]


@router.post("/")
async def create_task(req: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(
        title=req.title,
        description=req.description,
        priority=req.priority,
        milestone=req.milestone,
        source=req.source,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return {"id": task.id, "title": task.title, "status": task.status}


@router.patch("/{task_id}")
async def update_task(task_id: int, req: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if req.status:
        task.status = req.status
    if req.priority:
        task.priority = req.priority
    await db.flush()
    return {"id": task.id, "status": task.status}


@router.delete("/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    return {"message": "Deleted"}
