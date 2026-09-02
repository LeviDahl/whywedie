// Pipeline: POPULATION CHANGE (births vs. deaths, natural increase)
//
// Reads the WONDER pipeline snapshots, with a Socrata call only for the
// deep pre-1960 birth history:
//   - /data/natality.json   annual US births (1960–2022, WONDER D27/D66 +
//                            Socrata baseline)
//   - /data/mortality.json   annual all-cause deaths ("All causes" rows:
//                            D76 1999–2020 + D176 provisional 2021+)
//   - e6fc-ccez (Socrata)    US births 1909–1959, for the long-view chart
//
// births − deaths = natural increase. The overlap is 1999→2022 (bounded by
// the natality series). Years whose death figure comes from the provisional
// database (2021+) are flagged so the view can render them dashed.

import { socrataQuery } from './socrata.js'

const NATALITY_URL = `${import.meta.env.BASE_URL}data/natality.json`
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
    if (v?.births != null) m.set(Number(y), v.births)
  }
  return m
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
  const [natality, mortality] = await Promise.all([getJson(NATALITY_URL), getJson(MORTALITY_URL)])

  const births = birthsByYear(natality)
  const deaths = deathsByYear(mortality)

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
    provisional: years.map((y) => y > FINAL_DEATHS_THROUGH)
  }
}

export async function fetchBirthHistory() {
  const [deepRows, natality] = await Promise.all([
    socrataQuery(BIRTHS_ID, {
      $select: 'year, birth_number',
      $order: 'year',
      $limit: 5000
    }).catch(() => []),
    getJson(NATALITY_URL)
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
