// Why We Die API — small proxy between the Vue frontend and CDC WONDER.
//
// Deployed on GoDaddy's cPanel "Setup Node.js App" (Passenger), which sets
// PORT itself and expects the app to just listen on it. See README.md /
// CLAUDE.md for the exact cPanel setup steps.

const express = require('express')
const { getCached } = require('./lib/cache')
const { fetchDeathStatistics } = require('./lib/deathStatistics')

const app = express()
const PORT = process.env.PORT || 4000

// CDC's finalized annual mortality data changes at most once a year — no
// need to refresh more than daily, and this keeps us well within CDC's
// "be a polite client" guidance.
const ONE_DAY_MS = 24 * 60 * 60 * 1000

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.get('/api/death-statistics', async (_req, res) => {
  try {
    const { data, cache } = await getCached('death-statistics', ONE_DAY_MS, fetchDeathStatistics)
    res.set('X-Cache', cache)
    res.json(data)
  } catch (err) {
    console.error('[death-statistics] failed:', err.message)
    if (err.wonderResponseText) {
      console.error('[death-statistics] raw CDC WONDER response:', err.wonderResponseText.slice(0, 2000))
    }
    res.status(502).json({
      error: 'Failed to fetch death statistics from CDC WONDER.',
      detail: err.message,
      // Truncated raw response so a bad parameter is easy to diagnose —
      // remove this if it ever needs to be hidden from clients.
      wonderResponseExcerpt: err.wonderResponseText ? err.wonderResponseText.slice(0, 1000) : undefined,
    })
  }
})

app.listen(PORT, () => {
  console.log(`whywedie API listening on port ${PORT}`)
})
