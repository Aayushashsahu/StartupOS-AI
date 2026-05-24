# StartupOS AI — Backend

FastAPI backend that proxies all AI requests to Google Gemini.
The `GOOGLE_API_KEY` lives here and only here — never in the frontend.

## Setup

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Open .env and set your GOOGLE_API_KEY

# 4. Run
python main.py
# or: uvicorn main:app --reload --port 8000
```

## Key files

| File | Purpose |
|---|---|
| `main.py` | FastAPI app, CORS, router registration |
| `config.py` | All settings loaded from `.env` |
| `database.py` | SQLAlchemy async models + init |
| `services/ai_service.py` | Gemini client, mock fallback, all AI methods |
| `routers/*.py` | REST endpoints per module |
| `middleware/auth.py` | JWT helpers (ready to activate) |

## AI Provider config

```env
# Use Gemini (real AI)
AI_PROVIDER=gemini
GOOGLE_API_KEY=your_key_here

# Use mock (no key needed — demo mode)
AI_PROVIDER=mock
```

## Endpoints

- `GET  /api/health`
- `GET  /api/docs`  ← Interactive Swagger UI
- `POST /api/meetings/summarize`
- `POST /api/content/generate`
- `POST /api/ideas/{id}/expand`
- `POST /api/tasks/plan`
- `POST /api/research/`
- `POST /api/chat/`
- `WS   /ws/chat`
