// Thin fetch wrapper around GET /api/death-statistics (see server/app.js).
// Same-origin in production (the Node API is served from /api on the same
// domain); proxied to a local server in dev — see vite.config.js.

export async function fetchDeathStatistics() {
  const res = await fetch('/api/death-statistics')
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message = body?.detail || body?.error || `Request failed with status ${res.status}`
    throw new Error(message)
  }

  if (!body) {
    throw new Error('Received an empty response from the server.')
  }

  return body
}
