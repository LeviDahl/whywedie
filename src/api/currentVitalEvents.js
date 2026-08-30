// Pipeline: CURRENT MONTHLY BIRTH / DEATH DATA
// Dataset: "AH Monthly Provisional Counts of Live Births, Deaths, and
// Other Vital Events" — data.cdc.gov, ID hmz2-vwda
// https://data.cdc.gov/d/hmz2-vwda
//
// Verified live against the real dataset while building this. A few things
// that aren't obvious from the dataset name, confirmed by querying it
// directly:
//   - `state` includes a national total row where state = 'UNITED STATES'
//     (all caps) alongside every individual state — must filter to it, or
//     totals will double-count.
//   - `period` has two values, 'Monthly' and '12 Month-ending' (a rolling
//     12-month figure) — must filter to 'Monthly' for a true month-by-month
//     series.
//   - `indicator` values are exactly 'Number of Live Births', 'Number of
//     Deaths', and 'Number of Infant Deaths' (not "Provisional Number of
//     ..." — there's no "Provisional" in the actual indicator text).
//   - There's no rate/age-adjusted figure here, only raw counts.
//
// ⚠️ Data currency: as of when this was built, this dataset's most recent
// record was June 2024, despite being CDC's "current provisional" table —
// it hasn't been refreshed as often as its quarterly (R/P3M) update
// schedule implies. This is CDC's most current source for this figure;
// the UI surfaces the actual latest date rather than assuming it's "now."

import { socrataQuery } from './socrata.js'

const DATASET_ID = 'hmz2-vwda'
const SOURCE_LABEL =
  'CDC (data.cdc.gov, Socrata) — AH Monthly Provisional Counts of Live Births, Deaths, and Other Vital Events'

const MONTH_INDEX = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11
}

async function fetchMonthlyIndicator(indicator) {
  const rows = await socrataQuery(DATASET_ID, {
    $where: `state='UNITED STATES' AND period='Monthly' AND indicator='${indicator}'`,
    $order: 'year, month',
    $limit: 1000
  })

  const points = rows
    .map((row) => ({
      year: Number(row.year),
      month: row.month,
      monthIndex: MONTH_INDEX[row.month] ?? -1,
      value: Number(row.data_value)
    }))
    .filter((p) => Number.isFinite(p.year) && p.monthIndex >= 0 && Number.isFinite(p.value))
    .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex)

  return {
    source: SOURCE_LABEL,
    fetchedAt: new Date().toISOString(),
    labels: points.map((p) => `${p.month.slice(0, 3)} ${p.year}`),
    values: points.map((p) => p.value)
  }
}

export function fetchCurrentMonthlyDeaths() {
  return fetchMonthlyIndicator('Number of Deaths')
}

export function fetchCurrentMonthlyBirths() {
  return fetchMonthlyIndicator('Number of Live Births')
}
