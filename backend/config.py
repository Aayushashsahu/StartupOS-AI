"""
config.py — Central configuration
All settings loaded from environment variables via .env file.
Nothing is hardcoded here.
"""

import os
from dotenv import load_dotenv

# Load .env file from the backend directory
load_dotenv()


class Settings:
    # ── AI Provider ───────────────────────────────────────────
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock")        # "gemini" | "mock"
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = os.getenv("APP_NAME", "StartupOS AI")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    APP_ENV: str = os.getenv("APP_ENV", "development")

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./startupos.db"
    )

    # ── CORS ──────────────────────────────────────────────────
    @property
    def CORS_ORIGINS(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        return [origin.strip() for origin in raw.split(",")]

    # ── Derived ───────────────────────────────────────────────
    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    def validate(self):
        """Warn on startup if Gemini is selected but key is missing."""
        if self.AI_PROVIDER == "gemini" and not self.GOOGLE_API_KEY:
            print(
                "⚠️  WARNING: AI_PROVIDER=gemini but GOOGLE_API_KEY is not set in .env\n"
                "   Falling back to mock AI responses.\n"
                "   Get a key at: https://aistudio.google.com/app/apikey"
            )
            return False
        return True


settings = Settings()
