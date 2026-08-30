// Pipeline: HISTORICAL DEATH DATA (annual rollup baseline)
// Dataset: "Weekly Counts of Deaths by Jurisdiction and Select Causes of
// Death" — data.cdc.gov, ID muzy-jte6
// https://data.cdc.gov/d/muzy-jte6
//
// The raw data is weekly, per jurisdiction (every state + DC + NYC + PR,
// plus a 'United States' national total row each week). A server-side SoQL
// rollup (sum + group by year) avoids downloading and summing weekly rows
// client-side.
//
// ⚠️ Two things confirmed by querying the real dataset while building this
// that matter for how this gets displayed:
//   - `jurisdiction_of_occurrence='United States'` MUST be in the $where —
//     without it, the sum adds every state's total on top of the national
//     total and wildly overcounts.
//   - The most recent year in this dataset is a **partial year**: data
//     currently runs through week 37 of 2023 (mid-September), not the full
//     52-53 weeks. Summed naively, that partial year looks like a sharp
//     decline from the prior year — it's just incomplete. `week_count` is
//     fetched alongside the sum specifically so the UI can flag this
//     rather than show a misleading number un-caveated.

import { socrataQuery } from './socrata.js'

const DATASET_ID = 'muzy-jte6'
const SOURCE_LABEL =
  'CDC (data.cdc.gov, Socrata) — Weekly Counts of Deaths by Jurisdiction and Select Causes of Death'

// A handful of MMWR years legitimately have 53 weeks instead of 52; treat
// anything at or above 52 as "a complete year's worth of data."
const FULL_YEAR_WEEK_COUNT = 52

export async function fetchHistoricalAnnualDeaths() {
  const rows = await socrataQuery(DATASET_ID, {
    $select: 'mmwryear as year, sum(all_cause) as total_annual_deaths, count(*) as week_count',
    $where: "jurisdiction_of_occurrence='United States'",
    $group: 'mmwryear',
    $order: 'mmwryear'
  })

  const points = rows
    .map((row) => ({
      year: Number(row.year),
      totalDeaths: Number(row.total_annual_deaths),
      weekCount: Number(row.week_count)
    }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.totalDeaths))
    .sort((a, b) => a.year - b.year)

  return {
    source: SOURCE_LABEL,
    fetchedAt: new Date().toISOString(),
    years: points.map((p) => p.year),
    totalDeaths: points.map((p) => p.totalDeaths),
    weekCount: points.map((p) => p.weekCount),
    isPartialYear: points.map((p) => p.weekCount < FULL_YEAR_WEEK_COUNT)
  }
}
