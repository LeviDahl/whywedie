// Queries CDC WONDER's "Underlying Cause of Death, 1999-2020" database
// (ID: D76) for national totals grouped by year: deaths, population,
// crude rate, and age-adjusted rate.
//
// *** THIS HAS NOT BEEN LIVE-TESTED against a real CDC WONDER response ***
// The build environment this was written in could not reach
// wonder.cdc.gov (outbound network to it was blocked), so the parameter
// list below was reconstructed from CDC's own API docs
// (https://wonder.cdc.gov/wonder/help/wonder-api.html) plus a verified
// working D76 query from a public example
// (https://github.com/alipphardt/cdc-wonder-api), adapted to remove that
// example's cause/age filters so this pulls every year, every cause, every
// age/race/sex combined.
//
// TO VALIDATE / FIX if this doesn't work once deployed:
//   1. Go to https://wonder.cdc.gov/ucd-icd10.html
//   2. Under "Organize Table Layout", set Group Results By to "Year"
//   3. Under "Select Measures", check Deaths, Population, Crude Rate, and
//      Age-Adjusted Rate. Leave every other filter at its default ("All").
//   4. Click Send, then use the results page's Export/XML option to get
//      the exact request CDC's own UI generated for that query.
//   5. Compare it to buildDeathStatisticsParams() below and fix any
//      parameter name/value that differs.
//   6. GET /api/death-statistics on the deployed server will return the
//      raw CDC response text in its error `detail` field if parsing
//      fails, which tells you exactly what CDC rejected.
//
// Only one year-only "Group By" is used (no second dimension), so each
// response row is expected to look like:
//   <r><c l="1999"/><c v="2391399"/><c v="279040181"/><c v="857.0"/><c v="875.6"/></r>
// i.e. one label cell (the year) followed by one value cell per requested
// measure, in the order the measures were requested (Deaths, Population,
// Crude Rate, Age-Adjusted Rate).

const { queryWonder, toNumber } = require('./wonderClient')

const DATABASE_ID = 'D76'
const SOURCE_LABEL = 'CDC WONDER — Underlying Cause of Death, 1999-2020 (Database D76)'

function buildDeathStatisticsParams() {
  return [
    // --- Group results by Year only ---
    ['B_1', 'D76.V1-level1'],
    ['B_2', '*None*'],
    ['B_3', '*None*'],
    ['B_4', '*None*'],
    ['B_5', '*None*'],

    // --- Measures: Deaths, Population, Crude Rate, Age-Adjusted Rate ---
    ['M_1', 'D76.M1'],
    ['M_2', 'D76.M2'],
    ['M_3', 'D76.M3'],
    ['M_41', 'D76.M41'],
    ['M_42', 'D76.M42'],

    // --- Filters: no restriction on any of them (every year, every cause,
    // national totals — the API only exposes national data regardless) ---
    ['F_D76.V1', '*All*'],
    ['F_D76.V2', '*All*'],
    ['F_D76.V9', '*All*'],
    ['F_D76.V10', '*All*'],
    ['F_D76.V27', '*All*'],

    ['I_D76.V1', '*All* (All Dates)'],
    ['I_D76.V2', '*All* (All Causes of Death)'],
    ['I_D76.V9', '*All* (The United States)'],
    ['I_D76.V10', '*All* (The United States)'],
    ['I_D76.V27', '*All* (The United States)'],

    ['O_V1_fmode', 'freg'],
    ['O_V2_fmode', 'freg'],
    ['O_V9_fmode', 'freg'],
    ['O_V10_fmode', 'freg'],
    ['O_V27_fmode', 'freg'],

    ['O_aar', 'aar_std'],
    ['O_aar_pop', '0000'],
    ['O_age', 'D76.V5'],
    ['O_javascript', 'on'],
    ['O_location', 'D76.V9'],
    ['O_precision', '1'],
    ['O_rate_per', '100000'],
    ['O_show_totals', 'false'],
    ['O_timeout', '300'],
    ['O_title', 'Deaths and Age-Adjusted Death Rate by Year, United States'],
    ['O_ucd', 'D76.V2'],
    ['O_urban', 'D76.V19'],

    ['V_D76.V1', ''],
    ['V_D76.V2', ''],
    ['V_D76.V4', '*All*'],
    ['V_D76.V5', '*All*'],
    ['V_D76.V6', '00'],
    ['V_D76.V7', '*All*'],
    ['V_D76.V8', '*All*'],
    ['V_D76.V9', ''],
    ['V_D76.V10', ''],
    ['V_D76.V11', '*All*'],
    ['V_D76.V12', '*All*'],
    ['V_D76.V17', '*All*'],
    ['V_D76.V19', '*All*'],
    ['V_D76.V20', '*All*'],
    ['V_D76.V21', '*All*'],
    ['V_D76.V22', '*All*'],
    ['V_D76.V23', '*All*'],
    ['V_D76.V24', '*All*'],
    ['V_D76.V25', '*All*'],
    ['V_D76.V27', ''],
    ['V_D76.V51', '*All*'],
    ['V_D76.V52', '*All*'],

    ['VM_D76.M6_D76.V10', ''],
    ['VM_D76.M6_D76.V17', '*All*'],
    ['VM_D76.M6_D76.V1_S', '*All*'],
    ['VM_D76.M6_D76.V7', '*All*'],
    ['VM_D76.M6_D76.V8', '*All*'],

    ['finder-stage-D76.V1', 'codeset'],
    ['finder-stage-D76.V2', 'codeset'],
    ['finder-stage-D76.V9', 'codeset'],
    ['finder-stage-D76.V27', 'codeset'],

    ['action-Send', 'Send'],
    ['stage', 'request'],
  ]
}

async function fetchDeathStatistics() {
  const rows = await queryWonder(DATABASE_ID, buildDeathStatisticsParams())

  const years = []
  const deaths = []
  const population = []
  const crudeRate = []
  const ageAdjustedRate = []

  for (const row of rows) {
    const cells = Array.isArray(row.c) ? row.c : [row.c]
    const [yearCell, deathsCell, popCell, crudeCell, aarCell] = cells

    const year = toNumber(yearCell?.l ?? yearCell?.v)
    if (year === null) continue

    years.push(year)
    deaths.push(toNumber(deathsCell?.v))
    population.push(toNumber(popCell?.v))
    crudeRate.push(toNumber(crudeCell?.v))
    ageAdjustedRate.push(toNumber(aarCell?.v))
  }

  // Rows should already come back sorted by year, but don't rely on it.
  const order = years.map((_, i) => i).sort((a, b) => years[a] - years[b])

  return {
    source: SOURCE_LABEL,
    fetchedAt: new Date().toISOString(),
    years: order.map((i) => years[i]),
    deaths: order.map((i) => deaths[i]),
    population: order.map((i) => population[i]),
    crudeRate: order.map((i) => crudeRate[i]),
    ageAdjustedRate: order.map((i) => ageAdjustedRate[i]),
  }
}

module.exports = { fetchDeathStatistics }
