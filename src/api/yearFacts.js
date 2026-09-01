// One-shot loader for the "pick a year" panel on Home. Pulls the three
// series that have per-year US figures and returns a year → facts map.
//
//   births + crude birth rate : e6fc-ccez         1909–2018
//   total deaths              : bi63-dtpu "All causes"   1999–2017
//   leading cause of death    : /data/mortality.json (pipeline)  1999–2020
//
// Any given year fills in whatever the sources cover — the panel hides the
// rest.

import { socrataQuery } from './socrata.js'

const MORTALITY_URL = `${import.meta.env.BASE_URL}data/mortality.json`

export async function fetchYearFacts() {
  const [birthRows, deathRows, mortality] = await Promise.all([
    socrataQuery('e6fc-ccez', {
      $select: 'year, birth_number, crude_birth_rate',
      $order: 'year',
      $limit: 5000
    }),
    socrataQuery('bi63-dtpu', {
      $select: 'year, deaths',
      $where: "state='United States' AND cause_name='All causes'",
      $order: 'year',
      $limit: 5000
    }),
    fetch(MORTALITY_URL, { headers: { accept: 'application/json' } }).then((r) =>
      r.ok ? r.json() : null
    )
  ])

  const byYear = new Map()
  const ensure = (y) => {
    if (!byYear.has(y)) byYear.set(y, { year: y })
    return byYear.get(y)
  }

  for (const r of birthRows) {
    const y = Number(r.year)
    if (!Number.isFinite(y)) continue
    const rec = ensure(y)
    rec.births = Number(r.birth_number) || null
    rec.birthRate = Number(r.crude_birth_rate) || null
  }
  for (const r of deathRows) {
    const y = Number(r.year)
    if (!Number.isFinite(y)) continue
    ensure(y).deaths = Number(r.deaths) || null
  }
  if (mortality?.byYear) {
    for (const [y, rows] of Object.entries(mortality.byYear)) {
      const lead = rows
        .filter((c) => c.leading && c.deaths != null)
        .sort((a, b) => b.deaths - a.deaths)[0]
      if (lead) {
        const rec = ensure(Number(y))
        rec.leadingCause = lead.name // official name; view maps to friendly
        rec.leadingCauseDeaths = lead.deaths
      }
    }
  }

  for (const rec of byYear.values()) {
    if (rec.births != null && rec.deaths != null) {
      rec.naturalIncrease = rec.births - rec.deaths
    }
  }

  const years = [...byYear.keys()].sort((a, b) => a - b)
  return {
    minYear: years[0],
    maxYear: years[years.length - 1],
    years,
    byYear,
    source:
      'CDC (data.cdc.gov, Socrata) — NCHS Births and General Fertility Rates (e6fc-ccez), Leading Causes of Death "All causes" (bi63-dtpu); leading cause from the WONDER pipeline snapshot'
  }
}
