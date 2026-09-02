// Pipeline: MONTHLY BIRTHS (Birth Statistics "Monthly Births" chart)
//
// Source: /data/natality_monthly.json, written by the WONDER pipeline from
// D192 "Provisional Natality, 2023 through Last Month" grouped by Year x
// Month — a continuous national series back to Jan 2023.
//
// Replaces the Socrata table hmz2-vwda, which CDC trimmed to a rolling
// window (and stopped refreshing past June 2024). Until the pipeline era
// `natality/monthly` runs, the committed file is a stub with an empty
// `months` array — this module then falls back to the Socrata source so the
// chart still shows something.

import { fetchCurrentMonthlyBirths } from './currentVitalEvents.js'

const SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/natality_monthly.json`

// Trailing months are still accumulating late-filed records and read below
// the run rate — flag any under 80% of the prior 6-month median.
function flagPartial(values) {
  const partial = values.map(() => false)
  if (values.length >= 8) {
    const prior = values
      .slice(-7, -1)
      .filter((v) => v != null)
      .sort((a, b) => a - b)
    const ref = prior.length ? prior[Math.floor(prior.length / 2)] : null
    if (ref) {
      for (let i = values.length - 1; i >= values.length - 3; i--) {
        if (values[i] != null && values[i] < ref * 0.8) partial[i] = true
        else break
      }
    }
  }
  return partial
}

export async function fetchMonthlyBirths() {
  let raw = null
  try {
    const res = await fetch(SNAPSHOT_URL, { headers: { accept: 'application/json' } })
    if (res.ok) raw = await res.json()
  } catch {
    /* fall through to the Socrata source */
  }

  const months = raw?.months ?? []
  if (months.length) {
    const values = months.map((m) => m.births)
    return {
      source: raw.source,
      fetchedAt: raw.fetchedAt,
      labels: months.map((m) => m.label),
      values,
      partial: flagPartial(values),
      months
    }
  }

  // Fallback: CDC's Socrata provisional table (browser-direct).
  const socrata = await fetchCurrentMonthlyBirths()
  return {
    ...socrata,
    partial: flagPartial(socrata.values),
    months: []
  }
}
