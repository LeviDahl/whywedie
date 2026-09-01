// Pipeline: DAILY PACE (births & deaths as a per-day average)
//
// Uses hmz2-vwda's `period='12 Month-ending'` rows — a rolling 12-month
// total for births and for deaths, national — and takes the most recent
// month that has both. Dividing by 365 gives a "typical day" figure. This
// is more current than the annual-file sources (e6fc-ccez / bi63-dtpu);
// as of writing it reaches ~mid-2024.

import { socrataQuery } from './socrata.js'

const DATASET_ID = 'hmz2-vwda'
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export async function fetchDailyPace() {
  const rows = await socrataQuery(DATASET_ID, {
    $select: 'year, month, indicator, data_value',
    $where:
      "state='UNITED STATES' AND period='12 Month-ending' " +
      "AND (indicator='Number of Live Births' OR indicator='Number of Deaths')",
    $limit: 5000
  })

  const byKey = new Map()
  for (const r of rows) {
    const mi = MONTHS.indexOf(r.month)
    const value = Number(r.data_value)
    if (mi < 0 || !Number.isFinite(value)) continue
    const key = `${r.year}-${String(mi).padStart(2, '0')}`
    const rec = byKey.get(key) ?? { year: Number(r.year), monthIdx: mi }
    if (r.indicator === 'Number of Deaths') rec.deaths = value
    else rec.births = value
    byKey.set(key, rec)
  }

  const complete = [...byKey.values()]
    .filter((r) => Number.isFinite(r.births) && Number.isFinite(r.deaths))
    .sort((a, b) => a.year - b.year || a.monthIdx - b.monthIdx)

  const latest = complete[complete.length - 1]
  if (!latest) {
    throw new Error('No 12-month-ending births+deaths rows found in ' + DATASET_ID)
  }

  return {
    source:
      'CDC (data.cdc.gov, Socrata) — VSRR Provisional Counts for Live Births and Deaths (hmz2-vwda), 12-month-ending totals',
    fetchedAt: new Date().toISOString(),
    periodLabel: `the 12 months ending ${MONTHS[latest.monthIdx]} ${latest.year}`,
    birthsPerYear: latest.births,
    deathsPerYear: latest.deaths
  }
}
