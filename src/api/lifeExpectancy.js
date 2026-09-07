// US life expectancy at birth, 1900–present.
//
//   1900–2018   Socrata `w9j2-ggv5` ("NCHS - Death rates and life
//               expectancy at birth"), All Races / Both Sexes — the same
//               dataset historicalDeaths.js uses for the pre-1968 rate.
//   2019–2023   a small committed supplement from NCHS's final annual
//               figures (National Vital Statistics Reports / "Mortality in
//               the United States" data briefs) — the Socrata table stops
//               at 2018. Flagged so the source line stays honest and the
//               chart can render them distinctly.
//
// Browser-direct Socrata, no pipeline. Same static-site rules as
// historicalDeaths.js.
import { socrataQuery } from './socrata.js'

const DATASET_ID = 'w9j2-ggv5'

// NCHS final life expectancy at birth (years). Update as new finals land.
const NCHS_SUPPLEMENT = {
  2019: 78.8,
  2020: 77.0,
  2021: 76.4,
  2022: 77.5,
  2023: 78.4
}
const SUPPLEMENT_FROM = 2019

export async function fetchLifeExpectancy() {
  let rows = []
  try {
    rows = await socrataQuery(DATASET_ID, {
      $select: 'year, average_life_expectancy',
      $where: "race='All Races' AND sex='Both Sexes'",
      $order: 'year ASC',
      $limit: 5000
    })
  } catch (e) {
    // If Socrata is unreachable we can still show the supplement years, but
    // that's a poor chart — surface the error instead.
    throw new Error(`Couldn't load life expectancy from Socrata ${DATASET_ID}: ${e.message}`)
  }

  const byYear = new Map()
  for (const r of rows) {
    const y = Number(r.year)
    const v = r.average_life_expectancy == null ? null : Number(r.average_life_expectancy)
    if (Number.isFinite(y) && Number.isFinite(v)) byYear.set(y, v)
  }
  for (const [y, v] of Object.entries(NCHS_SUPPLEMENT)) {
    if (!byYear.has(Number(y))) byYear.set(Number(y), v)
  }

  const years = [...byYear.keys()].sort((a, b) => a - b)
  const values = years.map((y) => byYear.get(y))
  const muted = years.map((y) => y >= SUPPLEMENT_FROM)

  const usedSupplement = years.some((y) => y >= SUPPLEMENT_FROM)
  const source =
    `NCHS via data.cdc.gov (${DATASET_ID}), 1900–2018` +
    (usedSupplement ? `; 2019–${years.at(-1)} from NCHS final annual figures` : '')

  return { years, values, muted, supplementFrom: SUPPLEMENT_FROM, source }
}
