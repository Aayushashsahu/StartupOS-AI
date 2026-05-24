"""
main.py — StartupOS AI Backend Entry Point

Flow: React Frontend → THIS FastAPI server → Google Gemini (via ai_service.py)
The Google API key lives ONLY in .env → loaded by config.py → used in ai_service.py
Never exposed to the frontend.

Run: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import dashboard, meetings, content, ideas, tasks, chat, research


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"🚀 Starting {settings.APP_NAME}")
    print(f"   AI Provider: {settings.AI_PROVIDER}")
    print(f"   Environment: {settings.APP_ENV}")
    print(f"   Database: {settings.DATABASE_URL}")

    # Validate config and warn if key is missing
    settings.validate()

    # Initialize SQLite database
    await init_db()

    yield

    print("👋 Shutting down StartupOS AI")


# ── Create App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="AI Operating System for Startup Founders — Backend API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
# Allows the React frontend (localhost:5173) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(meetings.router,  prefix="/api/meetings",  tags=["Meetings"])
app.include_router(content.router,   prefix="/api/content",   tags=["Content"])
app.include_router(ideas.router,     prefix="/api/ideas",     tags=["Ideas"])
app.include_router(tasks.router,     prefix="/api/tasks",     tags=["Tasks"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["Chat"])
app.include_router(research.router,  prefix="/api/research",  tags=["Research"])

# WebSocket lives at /ws/chat (registered directly from chat router)
app.include_router(chat.router, tags=["WebSocket"])


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "ai_provider": settings.AI_PROVIDER,
        "environment": settings.APP_ENV,
    }


# ── Dev entrypoint ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.APP_PORT,
        reload=settings.is_development,
    )
