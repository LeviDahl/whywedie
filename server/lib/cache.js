// Tiny disk cache. CDC WONDER's finalized annual mortality/natality data
// changes at most once a year, and CDC asks automated clients to query
// gently (~1 request per 2 minutes), so there's no reason to hit WONDER on
// every page load — cache aggressively and serve stale data rather than
// fail if a refresh attempt errors.

const fs = require('fs/promises')
const path = require('path')

const CACHE_DIR = path.join(__dirname, '..', 'cache')

async function readCache(key) {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeCache(key, data) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Get fresh data for `key`, using `fetcher()` when the cache is missing or
 * older than `maxAgeMs`. Falls back to stale cache (rather than throwing)
 * if `fetcher()` fails and something is already cached.
 */
async function getCached(key, maxAgeMs, fetcher) {
  const cached = await readCache(key)
  const isFresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < maxAgeMs

  if (isFresh) return { data: cached, cache: 'hit' }

  try {
    const fresh = await fetcher()
    await writeCache(key, fresh)
    return { data: fresh, cache: cached ? 'refreshed' : 'miss' }
  } catch (err) {
    if (cached) {
      console.error(`[cache] refresh of "${key}" failed, serving stale copy from ${cached.fetchedAt}:`, err.message)
      return { data: cached, cache: 'stale-fallback' }
    }
    throw err
  }
}

module.exports = { getCached }
