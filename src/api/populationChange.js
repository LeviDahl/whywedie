// Pipeline: POPULATION CHANGE (births vs. deaths, natural increase)
//
// Two data.cdc.gov Socrata datasets, browser-direct (no pipeline):
//   - e6fc-ccez  "NCHS - Births and General Fertility Rates: United States"
//                annual US birth counts + crude birth rate, 1909–2018.
//                Note: `year` is stored as a STRING here.
//   - bi63-dtpu  "NCHS - Leading Causes of Death: United States" — its
//                `cause_name = 'All causes'` rows are the national annual
//                death total, 1999–2017. (`state = 'United States'`, not
//                all-caps.)
//
// Natural increase = births − deaths. The two series only overlap 1999–2017,
// which is what fetchBirthsVsDeaths() returns. The WONDER pipeline (natality
// D149/D66/D27 + a no-cause D76 total) would extend this and reach 2021 —
// the first year US deaths exceeded births.

import { socrataQuery } from './socrata.js'

const BIRTHS_ID = 'e6fc-ccez'
const DEATHS_ID = 'bi63-dtpu'

const BIRTHS_SOURCE =
  'CDC (data.cdc.gov, Socrata) — NCHS Births and General Fertility Rates: United States (e6fc-ccez)'
const COMBINED_SOURCE =
  `${BIRTHS_SOURCE}; deaths from NCHS Leading Causes of Death, "All causes" (bi63-dtpu)`

export async function fetchBirthsVsDeaths() {
  const [birthRows, deathRows] = await Promise.all([
    socrataQuery(BIRTHS_ID, { $select: 'year, birth_number', $order: 'year', $limit: 5000 }),
    socrataQuery(DEATHS_ID, {
      $select: 'year, deaths',
      $where: "state='United States' AND cause_name='All causes'",
      $order: 'year',
      $limit: 5000
    })
  ])

  const births = new Map(birthRows.map((r) => [Number(r.year), Number(r.birth_number)]))
  const deaths = new Map(deathRows.map((r) => [Number(r.year), Number(r.deaths)]))

  const years = [...deaths.keys()]
    .filter((y) => Number.isFinite(births.get(y)) && Number.isFinite(deaths.get(y)))
    .sort((a, b) => a - b)

  return {
    source: COMBINED_SOURCE,
    fetchedAt: new Date().toISOString(),
    years,
    births: years.map((y) => births.get(y)),
    deaths: years.map((y) => deaths.get(y)),
    naturalIncrease: years.map((y) => births.get(y) - deaths.get(y))
  }
}

export async function fetchBirthHistory() {
  const rows = await socrataQuery(BIRTHS_ID, {
    $select: 'year, birth_number',
    $order: 'year',
    $limit: 5000
  })
  const points = rows
    .map((r) => ({ year: Number(r.year), births: Number(r.birth_number) }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.births))
    .sort((a, b) => a.year - b.year)

  return {
    source: BIRTHS_SOURCE,
    fetchedAt: new Date().toISOString(),
    years: points.map((p) => p.year),
    births: points.map((p) => p.births)
  }
}
