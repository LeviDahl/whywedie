// Pipeline: POPULATION CHANGE (births vs. deaths, natural increase)
//
// Reads the WONDER pipeline snapshots, with a Socrata call only for the
// deep pre-1960 birth history:
//   - /data/natality.json    annual US births (Socrata baseline + WONDER
//                             D27/D66 + D192 provisional, 1960–present)
//   - /data/mortality.json    annual all-cause deaths ("All causes" rows:
//                             D74/D16 1968–1998 + D76 1999–2020 + D176 2021+)
//   - e6fc-ccez (Socrata)     US births 1909–1959, for the long-view chart
//
// births − deaths = natural increase. The overlap is bounded by the two
// series — deaths back to 1968, births forward to the last full year — so it
// currently runs ~1968→2025. A partial trailing birth year is excluded.
// Years whose death figure comes from the provisional database (2021+) are
// flagged so the view can render them dashed.

import { socrataQuery } from './socrata.js'
import { fetchAnnualNatality } from './natality.js'

const MORTALITY_URL = `${import.meta.env.BASE_URL}data/mortality.json`
const BIRTHS_ID = 'e6fc-ccez'

const SOURCE =
  'CDC WONDER pipeline snapshots — natality.json (births) + mortality.json all-cause (deaths)'
const HISTORY_SOURCE = `${SOURCE}; pre-1960 births from CDC Socrata NCHS Births (e6fc-ccez)`

const FINAL_DEATHS_THROUGH = 2020

const getJson = (url) =>
  fetch(url, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null))

function birthsByYear(natality) {
  const m = new Map()
  for (const [y, v] of Object.entries(natality?.byYear ?? {})) {
    if (v?.births != null && !v.partial) m.set(Number(y), v.births)
  }
  return m
}

// year the births series turns provisional (rolled up from monthly, no rate)
function firstProvisionalBirthYear(natality) {
  const ys = Object.entries(natality?.byYear ?? {})
    .filter(([, v]) => v?.provisional)
    .map(([y]) => Number(y))
  return ys.length ? Math.min(...ys) : Infinity
}

function deathsByYear(mortality) {
  const m = new Map()
  for (const [y, rows] of Object.entries(mortality?.byYear ?? {})) {
    const all = (rows ?? []).find((c) => c.code === 'All causes' || c.name === 'All causes')
    if (all?.deaths != null) m.set(Number(y), all.deaths)
  }
  return m
}

export async function fetchBirthsVsDeaths() {
  const [natality, mortality] = await Promise.all([fetchAnnualNatality(), getJson(MORTALITY_URL)])

  const births = birthsByYear(natality)
  const deaths = deathsByYear(mortality)
  const provBirthFrom = firstProvisionalBirthYear(natality)

  const years = [...deaths.keys()]
    .filter((y) => births.has(y))
    .sort((a, b) => a - b)

  return {
    source: SOURCE,
    fetchedAt: new Date().toISOString(),
    years,
    births: years.map((y) => births.get(y)),
    deaths: years.map((y) => deaths.get(y)),
    naturalIncrease: years.map((y) => births.get(y) - deaths.get(y)),
    // provisional if the death figure or the birth figure is provisional
    provisional: years.map((y) => y > FINAL_DEATHS_THROUGH || y >= provBirthFrom)
  }
}

export async function fetchBirthHistory() {
  const [deepRows, natality] = await Promise.all([
    socrataQuery(BIRTHS_ID, {
      $select: 'year, birth_number',
      $order: 'year',
      $limit: 5000
    }).catch(() => []),
    fetchAnnualNatality()
  ])

  const byYear = new Map()
  for (const r of deepRows) {
    const y = Number(r.year)
    const b = Number(r.birth_number)
    if (Number.isFinite(y) && Number.isFinite(b)) byYear.set(y, b)
  }
  // pipeline natality wins where it has data (1960–2022)
  for (const [y, b] of birthsByYear(natality)) byYear.set(y, b)

  const years = [...byYear.keys()].sort((a, b) => a - b)
  return {
    source: HISTORY_SOURCE,
    fetchedAt: new Date().toISOString(),
    years,
    births: years.map((y) => byYear.get(y))
  }
}
