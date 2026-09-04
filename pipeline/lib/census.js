// Client for the Census Bureau Population Estimates Program (PEP) API.
//
// Used ONLY to backfill the general fertility rate's denominator (women
// aged 15-44, national) for years past WONDER's natality coverage
// (2021+ — D66/D27 stop supplying it after 2020; see natality_mid.xml /
// CLAUDE.md "General fertility rate stops at 2020"). Not part of the
// WONDER path — no XML template, no fetch.js era; see
// fetch-census-fertility.js for the runner.
//
// Dataset: pep/charv, "Vintage NNNN ... Characteristics" — the modern
// (post-2020-census) replacement for the old pep/agesex table. One release
// ("vintage") per year, each covering April 1 of (vintage-3) through
// July 1 of vintage (e.g. vintage 2023 = 2020-2023). Confirmed 2026-09:
//   - AGE is a zero-padded 4-digit code: single ages are "<age>00"
//     (e.g. "1500" = age 15); "0001" = under 1; aggregate groups like
//     "0401" (under 5) or "8599" (85+) use other codes, which is why we
//     filter to an explicit single-age set rather than trusting AGE < N.
//   - UNIVERSE=R selects the plain resident-population table (the
//     dataset multiplexes several tables — by age/sex, by age/sex/race,
//     etc. — through this one endpoint).
//   - MONTH=7 is the July 1 (mid-year) estimate, matching the convention
//     WONDER's natality M5 measure uses for its own population figure.
//   - SEX=2 is female.
//   - The single-year-age/sex table lags the vintage number by ~1.5
//     years, so the newest vintage isn't necessarily published yet —
//     findLatestVintage() probes downward to find one that is.

import axios from 'axios'

const BASE = 'https://api.census.gov/data'
const DATASET = 'pep/charv'
const AGE_MIN = 15
const AGE_MAX = 44
const FEMALE = '2'
const JULY = '7'

function ageCode(age) {
  return String(age).padStart(2, '0') + '00'
}

async function get(vintage, params) {
  const url = `${BASE}/${vintage}/${DATASET}`
  const res = await axios.get(url, { params, validateStatus: () => true, timeout: 30000 })
  return res
}

/** Probe vintages newest-first; return the first with age/sex data. */
export async function findLatestVintage(apiKey, { from = new Date().getUTCFullYear(), back = 5 } = {}) {
  for (let v = from; v >= from - back; v--) {
    const res = await get(v, {
      get: 'NAME,POP',
      UNIVERSE: 'R',
      SEX: FEMALE,
      MONTH: JULY,
      AGE: ageCode(AGE_MIN),
      for: 'us:1',
      key: apiKey,
    })
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 1) return v
  }
  throw new Error(`No Census PEP vintage with age/sex data found in ${from - back}-${from}`)
}

/**
 * Women aged 15-44, national, July-1 estimate, for every year `vintage`
 * covers. Returns Map<year, population>.
 */
export async function fetchWomen15to44(vintage, apiKey) {
  const res = await get(vintage, {
    get: 'NAME,POP,AGE,YEAR',
    UNIVERSE: 'R',
    SEX: FEMALE,
    MONTH: JULY,
    for: 'us:1',
    key: apiKey,
  })
  if (res.status !== 200 || !Array.isArray(res.data)) {
    throw new Error(
      `Census PEP request failed (vintage ${vintage}, HTTP ${res.status}): ` +
        `${typeof res.data === 'string' ? res.data.slice(0, 300) : JSON.stringify(res.data).slice(0, 300)}`
    )
  }

  const [header, ...rows] = res.data
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  const wanted = new Set()
  for (let age = AGE_MIN; age <= AGE_MAX; age++) wanted.add(ageCode(age))

  const byYear = new Map()
  const seen = new Map() // year -> Set(age codes seen), to detect a short row
  for (const row of rows) {
    const ageC = row[idx.AGE]
    if (!wanted.has(ageC)) continue
    const year = Number(row[idx.YEAR])
    const pop = Number(row[idx.POP])
    byYear.set(year, (byYear.get(year) ?? 0) + pop)
    if (!seen.has(year)) seen.set(year, new Set())
    seen.get(year).add(ageC)
  }
  for (const [year, codes] of seen) {
    if (codes.size !== wanted.size) {
      throw new Error(
        `Census PEP vintage ${vintage} year ${year}: got ${codes.size}/${wanted.size} ` +
          `single-age rows for women 15-44 — response shape may have changed.`
      )
    }
  }
  return byYear
}
