// Generic client for data.cdc.gov's Socrata (SODA) JSON API.
//
// Unlike CDC WONDER, Socrata datasets are plain JSON over GET and support
// CORS, so the browser can call them directly — no backend proxy. (This
// was verified against live data while building this — see individual
// pipeline modules for the exact queries — but CORS itself wasn't
// confirmed from a browser in the build environment. Socrata's `/resource/
// *.json` endpoints are documented to send permissive CORS headers, which
// is the whole reason this approach works without a proxy; if a request
// ever fails with a CORS error in the browser console instead of a normal
// HTTP error, that's the thing to re-check.)
//
// Docs: https://dev.socrata.com/docs/queries/

const BASE_URL = 'https://data.cdc.gov/resource'

/**
 * Query a Socrata dataset with SoQL parameters (https://dev.socrata.com/docs/queries/).
 * `params` keys should include the leading `$` (e.g. `$where`, `$select`,
 * `$group`, `$order`, `$limit`) — URLSearchParams handles all the escaping,
 * so values don't need manual URL-encoding.
 */
export async function socrataQuery(datasetId, params = {}) {
  const url = new URL(`${BASE_URL}/${datasetId}.json`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  let res
  try {
    res = await fetch(url.toString())
  } catch (err) {
    throw new Error(`Could not reach data.cdc.gov: ${err.message}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`data.cdc.gov request failed (HTTP ${res.status}): ${text.slice(0, 300) || res.statusText}`)
  }

  return res.json()
}
