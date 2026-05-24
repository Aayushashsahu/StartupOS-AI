"""
database.py — SQLite database setup with SQLAlchemy async
Tables: meetings, content_history, ideas, tasks, task_plans, chat_messages
"""

import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, Integer, DateTime, JSON, Boolean
from config import settings


# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.is_development,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


# ── Base Model ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Models ────────────────────────────────────────────────────────────────────

class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    key_points: Mapped[dict] = mapped_column(JSON, default=list)        # list of strings
    action_items: Mapped[dict] = mapped_column(JSON, default=list)      # list of strings
    follow_up_email: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ContentHistory(Base):
    __tablename__ = "content_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)   # linkedin, twitter, blog, email
    tone: Mapped[str] = mapped_column(String(100), nullable=True)
    audience: Mapped[str] = mapped_column(String(255), nullable=True)
    generated_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Idea(Base):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="concept")  # concept, exploring, validated, building
    expanded: Mapped[dict] = mapped_column(JSON, default=dict)          # AI-generated expansion
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TaskPlan(Base):
    __tablename__ = "task_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    goal: Mapped[str] = mapped_column(String(500), nullable=False)
    timeline_days: Mapped[int] = mapped_column(Integer, default=30)
    milestones: Mapped[dict] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    milestone: Mapped[str] = mapped_column(String(255), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # high, medium, low
    status: Mapped[str] = mapped_column(String(20), default="todo")      # todo, in_progress, done
    source: Mapped[str] = mapped_column(String(50), default="manual")    # manual, agent, meetings
    plan_id: Mapped[int] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)       # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    module: Mapped[str] = mapped_column(String(50), default="copilot")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ── DB Init ───────────────────────────────────────────────────────────────────

async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database initialized")


async def get_db():
    """FastAPI dependency — yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
