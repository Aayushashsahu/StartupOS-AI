# StartupOS AI — v3.0
### AI Operating System for Startup Founders

> "JARVIS for startup operations" — meeting intelligence, content generation, CRM, research, task planning, idea vault, RAG memory, and multi-step AI agents in one dashboard.

---

## What's Inside

```
startupos-ai/
├── backend/          FastAPI · Google Gemini · SQLite · JWT-ready
└── frontend/         Vite + React · localStorage persistence · full UI
```

---

## v3 Features

| Feature | Detail |
|---|---|
| **Persistent History** | Every module saves to `localStorage`. Survives page refresh, tab close, re-open. |
| **Skeleton Loaders** | Every async operation shows shimmer skeletons — no empty states. |
| **Typed Error States** | Per-request error banners with **Retry →** button. Never a silent failure. |
| **Toast Notifications** | Success / warn / error toasts with type-coded left border. |
| **Tabbed Meeting Output** | Summary / Key Points / Action Items / Follow-up Email tabs. |
| **Cross-module Copilot** | Copilot reads your tasks, ideas, and meeting history for context. |
| **History Sidebars** | Every module has a persistent history panel. Click to restore, × to delete. |
| **CRM Persistence** | Contact status, notes auto-save to localStorage on every keystroke. |
| **Chat History** | Last 60 Copilot messages persisted. Timestamps on every message. |
| **Command Palette** | `⌘K` / `Ctrl+K` — search all modules and actions. |
| **User Session** | Login state persists across page refreshes. |
| **Backend API Security** | ALL AI calls go through FastAPI. Google API key never exposed to frontend. |

---

## Architecture

```
Browser (React)
    │
    │  HTTP /api/*          (proxied via Vite in dev)
    ▼
FastAPI Backend (Python)
    │
    │  google-generativeai SDK
    ▼
Google Gemini API   ◄──── GOOGLE_API_KEY (backend .env only)
    │
SQLite (startupos.db)
```

**Frontend never touches the AI API directly.**

---

## Quick Start

### 1. Backend

```bash
cd backend

# Copy environment file and fill in your Google API key
cp .env.example .env
# Edit .env → set GOOGLE_API_KEY=your_key_here

# Install dependencies
pip install -r requirements.txt

# Start server
python main.py
# → http://localhost:8000
# → API docs: http://localhost:8000/api/docs
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

> **No key yet?** Set `AI_PROVIDER=mock` in `.env`. The app runs fully with realistic mock responses.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api/* to backend automatically)
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

All secrets live in `backend/.env`. Never commit this file.

```env
# AI Provider: "gemini" | "mock"
AI_PROVIDER=gemini

# Google Gemini — get free key at aistudio.google.com
GOOGLE_API_KEY=your_google_api_key_here

# App
APP_NAME=StartupOS AI
APP_PORT=8000
APP_ENV=development

# Database (SQLite, zero setup)
DATABASE_URL=sqlite+aiosqlite:///./startupos.db

# CORS (add your production domain here)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | System health check |
| GET | `/api/dashboard/stats` | Aggregated module counts |
| POST | `/api/meetings/summarize` | AI meeting summarization |
| GET | `/api/meetings/` | List past meetings |
| POST | `/api/content/generate` | Generate platform content |
| GET | `/api/content/history` | Content history |
| GET | `/api/ideas/` | List ideas |
| POST | `/api/ideas/` | Create idea |
| POST | `/api/ideas/{id}/expand` | AI expand idea |
| POST | `/api/tasks/plan` | Generate AI task plan |
| GET | `/api/tasks/` | List tasks |
| PATCH | `/api/tasks/{id}` | Update task status |
| POST | `/api/chat/` | Chat with Copilot |
| GET | `/api/chat/history` | Chat history |
| POST | `/api/research/` | Research a topic |
| WS | `/ws/chat` | Streaming WebSocket chat |

Full interactive docs: `http://localhost:8000/api/docs`

---

## Database Schema

| Table | Purpose |
|---|---|
| `meetings` | Raw transcripts + AI-structured summaries |
| `content_history` | Generated posts with platform/tone metadata |
| `ideas` | Startup ideas + AI expansion JSON |
| `task_plans` | AI-generated plans from goals |
| `tasks` | Kanban tasks with status/priority/source |
| `chat_messages` | Persistent chat history per module |

---

## Frontend Data Flow

```
User Action
    │
    ▼
React Component  (App.jsx)
    │
    ├─ Optimistic UI update (immediate)
    │
    ├─ api/client.js  →  POST /api/...
    │       │
    │       ├─ Success → Save to localStorage (DB.push)
    │       │            Update component state
    │       │            Toast: "Saved ✓"
    │       │
    │       └─ Error  → Error state with Retry button
    │                    Toast: "Failed ⚠"
    │
    └─ Skeleton shown during loading
```

---

## localStorage Keys

| Key | Contents |
|---|---|
| `sos:user` | Logged-in user object |
| `sos:hist:meetings` | Meeting history (last 200) |
| `sos:hist:content` | Content history (last 200) |
| `sos:hist:research` | Research history (last 200) |
| `sos:hist:ideas` | Idea vault with expansions |
| `sos:tasks:board` | Kanban board state |
| `sos:crm:contacts` | CRM contacts + notes + status |
| `sos:chat:copilot` | Last 60 copilot messages |
| `sos:memory:docs` | Memory document index |

---

## Production Deployment

### Backend (e.g. Railway, Render, Fly.io)

```bash
# Set environment variables in your hosting dashboard
# GOOGLE_API_KEY, DATABASE_URL (switch to PostgreSQL), APP_ENV=production

uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend (e.g. Vercel, Netlify)

```bash
npm run build
# Deploy the /dist folder
# Set VITE_API_URL env var to your backend URL
```

Update `frontend/src/api/client.js`:
```js
const BASE = import.meta.env.VITE_API_URL || '/api'
```

Update `frontend/vite.config.js` proxy target to your production backend URL.

---

## Phase Roadmap

| Phase | Status | Features |
|---|---|---|
| **Phase 1 — MVP** | ✅ Complete | Dashboard, Meetings, Content, Ideas, Tasks, Copilot |
| **Phase 2 — Productivity** | ✅ Complete | CRM, Research, Agent Workflows, Memory, History |
| **Phase 3 — Advanced AI** | 🔜 Next | Vector DB (Pinecone), true RAG, multi-agent, voice |
| **Phase 4 — Integrations** | 🔜 Future | Gmail, Slack, Notion, Google Calendar, LinkedIn export |

---

## Tech Stack

**Backend**
- FastAPI 0.115 · Python 3.11+
- Google Gemini 2.0 Flash (`google-generativeai`)
- SQLAlchemy 2.0 async · aiosqlite
- python-dotenv · pydantic v2
- WebSockets (streaming chat)

**Frontend**
- React 18 · Vite 5
- Zero external UI libraries (all custom)
- localStorage persistence layer
- Fetch API with SSE streaming

---

## Security Notes

- `GOOGLE_API_KEY` never leaves the backend process
- Frontend only calls `/api/*` — your own server
- `.env` is in `.gitignore` — never committed
- JWT auth hooks are in place (`middleware/auth.py`) — plug in your auth provider
- All AI system prompts are server-side only

---

*Built to demonstrate: AI integration, backend engineering, API architecture, product thinking, and startup domain expertise.*
