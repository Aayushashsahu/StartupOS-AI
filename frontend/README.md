# StartupOS AI — Frontend

Vite + React dashboard. All AI calls go to the FastAPI backend — never directly to any AI API.

## Setup

```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # production build → /dist
```

## Key files

| File | Purpose |
|---|---|
| `src/App.jsx` | All UI — login, sidebar, all 10 modules |
| `src/api/client.js` | API client — only file that talks to backend |
| `src/index.css` | Global CSS reset + keyframe animations |
| `vite.config.js` | Dev proxy: `/api/*` → `localhost:8000` |

## localStorage persistence keys

All prefixed with `sos:` to avoid conflicts.

| Key | Data |
|---|---|
| `sos:user` | Logged-in user |
| `sos:hist:meetings` | Meeting history |
| `sos:hist:content` | Content history |
| `sos:hist:research` | Research history |
| `sos:hist:ideas` | Ideas + expansions |
| `sos:tasks:board` | Kanban state |
| `sos:crm:contacts` | CRM contacts |
| `sos:chat:copilot` | Chat messages |
| `sos:memory:docs` | Memory index |

## Adding a new module

1. Add entry to `NAV` array in `App.jsx`
2. Create a component function following the module pattern
3. Add to `modules` map in `App` render
4. Add a route in `backend/routers/` and register in `main.py`
5. Add API method to `src/api/client.js`
