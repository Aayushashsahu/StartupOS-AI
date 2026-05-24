/**
 * api/client.js — Frontend API Client
 *
 * ALL AI requests go: Frontend → FastAPI backend → Google Gemini
 * Never calls Gemini or any AI API directly.
 *
 * Base URL proxied to http://localhost:8000 via vite.config.js
 */

const BASE = '/api'

// ── Base fetch helper ─────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => apiFetch('/health'),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => apiFetch('/dashboard/stats'),
}

// ── Meetings ──────────────────────────────────────────────────────────────────
export const meetingsApi = {
  summarize: (title, transcript) =>
    apiFetch('/meetings/summarize', {
      method: 'POST',
      body: JSON.stringify({ title, transcript }),
    }),
  list: () => apiFetch('/meetings/'),
  get:  (id) => apiFetch(`/meetings/${id}`),
  delete: (id) => apiFetch(`/meetings/${id}`, { method: 'DELETE' }),
}

// ── Content ───────────────────────────────────────────────────────────────────
export const contentApi = {
  generate: ({ topic, platform, tone, audience }) =>
    apiFetch('/content/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, platform, tone, audience }),
    }),
  history: () => apiFetch('/content/history'),
}

// ── Ideas ─────────────────────────────────────────────────────────────────────
export const ideasApi = {
  list:   () => apiFetch('/ideas/'),
  create: (data) => apiFetch('/ideas/', { method: 'POST', body: JSON.stringify(data) }),
  expand: (id) => apiFetch(`/ideas/${id}/expand`, { method: 'POST' }),
  update: (id, data) => apiFetch(`/ideas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/ideas/${id}`, { method: 'DELETE' }),
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  plan:   (goal, timeline_days = 30) =>
    apiFetch('/tasks/plan', { method: 'POST', body: JSON.stringify({ goal, timeline_days }) }),
  list:   () => apiFetch('/tasks/'),
  create: (data) => apiFetch('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  send:    (message, module = 'copilot') =>
    apiFetch('/chat/', { method: 'POST', body: JSON.stringify({ message, module }) }),
  history: (module = 'copilot') => apiFetch(`/chat/history?module=${module}`),
}

// ── Research ──────────────────────────────────────────────────────────────────
export const researchApi = {
  search: (query) =>
    apiFetch('/research/', { method: 'POST', body: JSON.stringify({ query }) }),
}

// ── WebSocket Chat ─────────────────────────────────────────────────────────────
export function createChatSocket(onChunk, onDone) {
  const ws = new WebSocket(`ws://${window.location.host}/ws/chat`)
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.done) onDone()
    else if (data.chunk) onChunk(data.chunk)
  }
  return ws
}
