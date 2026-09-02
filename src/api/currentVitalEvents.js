// Pipeline: CURRENT MONTHLY BIRTHS (Birth Statistics "Monthly Births" chart)
// Dataset: "AH Monthly Provisional Counts of Live Births, Deaths, and
// Other Vital Events" — data.cdc.gov, ID hmz2-vwda
// https://data.cdc.gov/d/hmz2-vwda
//
// Monthly deaths moved to the WONDER pipeline (src/api/monthlyDeaths.js);
// this is births-only now. Quirks confirmed by querying the dataset:
//   - `state` has a 'UNITED STATES' (all caps) national row alongside the
//     per-state rows — must filter to it or totals double-count.
//   - `period` is 'Monthly' or '12 Month-ending'; filter to 'Monthly'.
//   - `indicator` = 'Number of Live Births' exactly (no "Provisional").
//
// ⚠️ Data currency: CDC trimmed this dataset to a rolling ~18-month window
// and, as of writing, hadn't refreshed it past June 2024. The chart shows
// the real latest date rather than assuming it's "now."

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

export function fetchCurrentMonthlyBirths() {
  return fetchMonthlyIndicator('Number of Live Births')
}
