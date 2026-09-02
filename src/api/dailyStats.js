// Pipeline: DAILY PACE (births & deaths as a per-day average)
//
// A "12-month-ending" total ÷ 365 — a rolling one-year average expressed
// per day. Built from the WONDER monthly snapshots:
//   /data/mortality_monthly.json  (D176, all-cause deaths by month)
//   /data/natality_monthly.json   (D192, births by month)
// Sum the last 12 months that BOTH cover (dropping a clearly-incomplete
// trailing month), divide by 365. Falls back to the Socrata rolling table
// (hmz2-vwda) if either snapshot is still a stub.

import { socrataQuery } from './socrata.js'

const MORTALITY_MONTHLY = `${import.meta.env.BASE_URL}data/mortality_monthly.json`
const NATALITY_MONTHLY = `${import.meta.env.BASE_URL}data/natality_monthly.json`
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const getJson = (url) =>
  fetch(url, { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)

// Drop a trailing month whose value is well under the prior few — it's still
// accumulating late-filed records.
function dropIncompleteTail(entries, key) {
  if (entries.length < 4) return entries
  const prior = entries.slice(-4, -1).map((e) => e[key]).filter((v) => v != null)
  const ref = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null
  const last = entries[entries.length - 1][key]
  return ref && last != null && last < ref * 0.6 ? entries.slice(0, -1) : entries
}

export async function fetchDailyPace() {
  const [mm, nm] = await Promise.all([getJson(MORTALITY_MONTHLY), getJson(NATALITY_MONTHLY)])
  const deaths = new Map((mm?.months ?? []).map((m) => [m.ym, m.deaths]))
  const births = new Map((nm?.months ?? []).map((m) => [m.ym, m.births]))

  const common = [...deaths.keys()]
    .filter((ym) => births.has(ym) && deaths.get(ym) != null && births.get(ym) != null)
    .sort()
    .map((ym) => ({ ym, deaths: deaths.get(ym), births: births.get(ym) }))

  const clean = dropIncompleteTail(dropIncompleteTail(common, 'deaths'), 'births')

  if (clean.length >= 12) {
    const window = clean.slice(-12)
    const [y, m] = window[window.length - 1].ym.split('-').map(Number)
    return {
      source:
        'CDC WONDER (wonder.cdc.gov) — Provisional Mortality (D176) & Provisional Natality (D192), monthly',
      fetchedAt: new Date().toISOString(),
      periodLabel: `the 12 months ending ${MONTHS[m - 1]} ${y}`,
      birthsPerYear: window.reduce((s, r) => s + r.births, 0),
      deathsPerYear: window.reduce((s, r) => s + r.deaths, 0)
    }
  }

  // Fallback: the older Socrata rolling table.
  return fetchDailyPaceSocrata()
}

async function fetchDailyPaceSocrata() {
  const rows = await socrataQuery('hmz2-vwda', {
    $select: 'year, month, indicator, data_value',
    $where:
      "state='UNITED STATES' AND period='12 Month-ending' " +
      "AND (indicator='Number of Live Births' OR indicator='Number of Deaths')",
    $limit: 5000
  })
  const byKey = new Map()
  for (const r of rows) {
    const mi = MONTHS.indexOf(r.month)
    const value = Number(r.data_value)
    if (mi < 0 || !Number.isFinite(value)) continue
    const key = `${r.year}-${String(mi).padStart(2, '0')}`
    const rec = byKey.get(key) ?? { year: Number(r.year), monthIdx: mi }
    if (r.indicator === 'Number of Deaths') rec.deaths = value
    else rec.births = value
    byKey.set(key, rec)
  }
  const complete = [...byKey.values()]
    .filter((r) => Number.isFinite(r.births) && Number.isFinite(r.deaths))
    .sort((a, b) => a.year - b.year || a.monthIdx - b.monthIdx)
  const latest = complete[complete.length - 1]
  if (!latest) throw new Error('No 12-month-ending births+deaths rows found in hmz2-vwda')
  return {
    source:
      'CDC (data.cdc.gov, Socrata) — VSRR Provisional Counts for Live Births and Deaths (hmz2-vwda), 12-month-ending totals',
    fetchedAt: new Date().toISOString(),
    periodLabel: `the 12 months ending ${MONTHS[latest.monthIdx]} ${latest.year}`,
    birthsPerYear: latest.births,
    deathsPerYear: latest.deaths
  }
}
