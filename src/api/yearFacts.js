// One-shot loader for the "pick a year" panel on Home. Pulls the series
// that have per-year US figures and returns a year → facts map.
//
//   births + birth rate  : /data/natality.json (WONDER pipeline, 1960–
//                          present), with Socrata e6fc-ccez (1909–2018)
//                          filling the pre-1960 tail for deep history
//   total deaths         : /data/mortality.json "All causes" row
//                          (D74/D16 1968–1998 + D76 1999–2020 + D176 2021+)
//   leading cause        : /data/mortality.json rankable ('#') rows —
//                          1999–present only (the 113-cause-list era)
//
// Any given year fills in whatever the sources cover — the panel hides the
// rest.

import { socrataQuery } from './socrata.js'

const MORTALITY_URL = `${import.meta.env.BASE_URL}data/mortality.json`
const NATALITY_URL = `${import.meta.env.BASE_URL}data/natality.json`

const getJson = (url) =>
  fetch(url, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null))

export async function fetchYearFacts() {
  const [birthHistory, natality, mortality] = await Promise.all([
    socrataQuery('e6fc-ccez', {
      $select: 'year, birth_number, crude_birth_rate',
      $order: 'year',
      $limit: 5000
    }).catch(() => []),
    getJson(NATALITY_URL),
    getJson(MORTALITY_URL)
  ])

  const byYear = new Map()
  const ensure = (y) => {
    if (!byYear.has(y)) byYear.set(y, { year: y })
    return byYear.get(y)
  }

  // Births: deep Socrata history first…
  for (const r of birthHistory) {
    const y = Number(r.year)
    if (!Number.isFinite(y)) continue
    const rec = ensure(y)
    rec.births = Number(r.birth_number) || null
    rec.birthRate = Number(r.crude_birth_rate) || null
  }
  // …then the pipeline natality snapshot wins wherever it has a value.
  if (natality?.byYear) {
    for (const [y, v] of Object.entries(natality.byYear)) {
      const rec = ensure(Number(y))
      if (v.births != null) rec.births = v.births
      if (v.birthRate != null) rec.birthRate = v.birthRate
    }
  }

  // Drop the trailing run of partial years — natality.json's newest row is
  // a part-year (D192 "through <month>"), and a half-year birth count in a
  // year lookup reads as a real annual figure. Same 70%-of-prior rule the
  // other natality consumers use.
  const natYears = [...byYear.keys()].sort((a, b) => a - b)
  for (let i = natYears.length - 1; i > 0; i--) {
    const cur = byYear.get(natYears[i])?.births
    const prev = byYear.get(natYears[i - 1])?.births
    if (cur != null && prev > 0 && cur < prev * 0.7) byYear.delete(natYears[i])
    else break
  }

  // Deaths + leading cause from the mortality snapshot.
  if (mortality?.byYear) {
    for (const [y, rows] of Object.entries(mortality.byYear)) {
      const rec = ensure(Number(y))
      const all = rows.find((c) => c.code === 'All causes' || c.name === 'All causes')
      if (all?.deaths != null) rec.deaths = all.deaths
      const lead = rows
        .filter((c) => c.leading && c.deaths != null)
        .sort((a, b) => b.deaths - a.deaths)[0]
      if (lead) {
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
      'CDC WONDER pipeline snapshots (mortality.json, natality.json) + ' +
      'CDC Socrata NCHS Births and General Fertility Rates (e6fc-ccez) for pre-1960 births'
  }
}
