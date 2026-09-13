// US state-level death rates — Feature #9 from the backlog. WONDER's
// pipeline is national-only, but NCHS's own VSRR quarterly provisional
// dataset (already used as a national fallback in historicalDeaths.js)
// carries a per-state age-adjusted rate column for ~20 leading causes, so
// this is browser-direct Socrata, no pipeline.
//
// Only ~3 years deep (2023 Q1 to today) since it's a rolling quarterly
// release, not a historical archive — this is a snapshot/ranking feature,
// not a decades-long trend like the rest of the site. Rates are per
// 100,000, age-adjusted, "12 months ending with quarter" (rather than the
// single 3-month figure, which is noisier and more seasonal).
import { socrataQuery } from './socrata.js'

const DATASET_ID = '489q-934x'

const STATE_FIELDS = {
  rate_alabama: 'Alabama',
  rate_alaska: 'Alaska',
  rate_arizona: 'Arizona',
  rate_arkansas: 'Arkansas',
  rate_california: 'California',
  rate_colorado: 'Colorado',
  rate_connecticut: 'Connecticut',
  rate_delaware: 'Delaware',
  rate_district_of_columbia: 'District of Columbia',
  rate_florida: 'Florida',
  rate_georgia: 'Georgia',
  rate_hawaii: 'Hawaii',
  rate_idaho: 'Idaho',
  rate_illinois: 'Illinois',
  rate_indiana: 'Indiana',
  rate_iowa: 'Iowa',
  rate_kansas: 'Kansas',
  rate_kentucky: 'Kentucky',
  rate_louisiana: 'Louisiana',
  rate_maine: 'Maine',
  rate_maryland: 'Maryland',
  rate_massachusetts: 'Massachusetts',
  rate_michigan: 'Michigan',
  rate_minnesota: 'Minnesota',
  rate_mississippi: 'Mississippi',
  rate_missouri: 'Missouri',
  rate_montana: 'Montana',
  rate_nebraska: 'Nebraska',
  rate_nevada: 'Nevada',
  rate_new_hampshire: 'New Hampshire',
  rate_new_jersey: 'New Jersey',
  rate_new_mexico: 'New Mexico',
  rate_new_york: 'New York',
  rate_north_carolina: 'North Carolina',
  rate_north_dakota: 'North Dakota',
  rate_ohio: 'Ohio',
  rate_oklahoma: 'Oklahoma',
  rate_oregon: 'Oregon',
  rate_pennsylvania: 'Pennsylvania',
  rate_rhode_island: 'Rhode Island',
  rate_south_carolina: 'South Carolina',
  rate_south_dakota: 'South Dakota',
  rate_tennessee: 'Tennessee',
  rate_texas: 'Texas',
  rate_utah: 'Utah',
  rate_vermont: 'Vermont',
  rate_virginia: 'Virginia',
  rate_washington: 'Washington',
  rate_west_virginia: 'West Virginia',
  rate_wisconsin: 'Wisconsin',
  rate_wyoming: 'Wyoming'
}

export async function fetchStateComparison() {
  let rows
  try {
    rows = await socrataQuery(DATASET_ID, {
      $where: "time_period='12 months ending with quarter' AND rate_type='Age-adjusted'",
      $select: 'year_and_quarter,cause_of_death,rate_overall,' + Object.keys(STATE_FIELDS).join(','),
      $order: 'year_and_quarter',
      $limit: 5000
    })
  } catch (e) {
    throw new Error(`Couldn't load state death rates from Socrata ${DATASET_ID}: ${e.message}`)
  }

  const num = (v) => (v == null || v === '' ? null : Number(v))

  // cause -> { quarters: [...], byQuarter: { quarter -> { national, states: [{state, rate}] } } }
  const byCause = new Map()
  for (const r of rows) {
    const cause = r.cause_of_death
    if (!byCause.has(cause)) byCause.set(cause, { quarters: [], byQuarter: {} })
    const entry = byCause.get(cause)
    if (!entry.byQuarter[r.year_and_quarter]) {
      entry.quarters.push(r.year_and_quarter)
      entry.byQuarter[r.year_and_quarter] = {
        national: num(r.rate_overall),
        states: Object.entries(STATE_FIELDS)
          .map(([field, name]) => ({ state: name, rate: num(r[field]) }))
          .filter((s) => s.rate != null)
      }
    }
  }

  const causes = [...byCause.keys()].sort((a, b) => a.localeCompare(b))
  const result = {}
  for (const [cause, entry] of byCause) {
    // Latest quarter with actual state data (the newest quarter can be
    // published nationally before every state's row is filled in).
    const withStates = entry.quarters.filter((q) => entry.byQuarter[q].states.length > 0)
    const latestQuarter = withStates.at(-1) ?? null
    result[cause] = {
      quarters: entry.quarters,
      latestQuarter,
      latest: latestQuarter ? entry.byQuarter[latestQuarter] : null
    }
  }

  return {
    causes,
    byCause: result,
    source: 'NCHS Vital Statistics Rapid Release, quarterly provisional estimates (data.cdc.gov 489q-934x)'
  }
}
