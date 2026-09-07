// US all-cause deaths by age group, per year.
//
// Source: Socrata `y5bj-9g5w` ("Weekly Counts of Deaths by Jurisdiction
// and Age", NCHS) — jurisdiction "United States", `type = 'Unweighted'`,
// pulled at week grain and rolled up to years client-side. Browser-direct,
// no pipeline.
//
// ⚠️ This NCHS table was last refreshed 2025-04. We keep only years with a
// full set of weeks (>= 52) so a half-filled recent year never shows —
// in practice that's ~2015–2022. A WONDER `by_age` era would extend and
// refresh this (see pipeline/README.md); this covers the pre-COVID
// baseline + the COVID years today.
import { socrataQuery } from './socrata.js'

const DATASET_ID = 'y5bj-9g5w'

// NCHS age buckets, youngest -> oldest.
const AGE_ORDER = [
  'Under 25 years',
  '25-44 years',
  '45-64 years',
  '65-74 years',
  '75-84 years',
  '85 years and older'
]

export async function fetchDeathsByAge() {
  let rows = []
  try {
    rows = await socrataQuery(DATASET_ID, {
      $select: 'year, week, age_group, number_of_deaths',
      $where: "jurisdiction='United States' AND type='Unweighted'",
      $limit: 50000
    })
  } catch (e) {
    throw new Error(`Couldn't load deaths by age from Socrata ${DATASET_ID}: ${e.message}`)
  }

  // year -> { weeks:Set, byAge:Map(group -> deaths) }
  const acc = new Map()
  for (const r of rows) {
    const y = Number(r.year)
    const v = Number(r.number_of_deaths)
    if (!Number.isFinite(y) || !Number.isFinite(v) || !AGE_ORDER.includes(r.age_group)) continue
    if (!acc.has(y)) acc.set(y, { weeks: new Set(), byAge: new Map() })
    const e = acc.get(y)
    e.weeks.add(String(r.week))
    e.byAge.set(r.age_group, (e.byAge.get(r.age_group) ?? 0) + v)
  }

  const years = [...acc.keys()]
    .filter((y) => acc.get(y).weeks.size >= 52)
    .sort((a, b) => a - b)

  const series = AGE_ORDER.map((g) => ({
    label: g,
    values: years.map((y) => acc.get(y).byAge.get(g) ?? null)
  }))
  const latestYear = years.at(-1) ?? null
  const latest = latestYear
    ? AGE_ORDER.map((g) => ({ group: g, deaths: acc.get(latestYear).byAge.get(g) ?? null }))
    : []

  return {
    ageGroups: AGE_ORDER,
    years,
    series,
    latestYear,
    latest,
    source: `NCHS "Weekly Counts of Deaths by Jurisdiction and Age" via data.cdc.gov (${DATASET_ID})`
  }
}
