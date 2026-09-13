// US vs. peer countries — Feature #12 from the backlog. WONDER and
// Socrata are both US-only, so this is the one section on the site that
// reaches for a different data source entirely: the World Bank's open
// API (api.worldbank.org), which is plain JSON with permissive CORS —
// browser-direct, like Socrata, no key, no proxy.
//
// Four countries, matching the site's 4 validated chart colors exactly
// (see src/charts/palette.js — adding a 5th/6th series color needs a
// fresh run of the dataviz skill's palette validator, not just a new hex
// value) rather than a longer, harder-to-read peer set: the US, the UK,
// France, and Japan. Picked for contrast, not comprehensiveness — Japan
// in particular is the clearest "crude rate can mislead" example on the
// site, since its much older population gives it a higher crude death
// rate than the US despite longer life expectancy.
const COUNTRIES = [
  { code: 'USA', name: 'United States' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'FRA', name: 'France' },
  { code: 'JPN', name: 'Japan' }
]

const INDICATORS = {
  deathRate: { code: 'SP.DYN.CDRT.IN', label: 'Crude death rate (per 1,000 people)' },
  lifeExpectancy: { code: 'SP.DYN.LE00.IN', label: 'Life expectancy at birth (years)' },
  fertilityRate: { code: 'SP.DYN.TFRT.IN', label: 'Fertility rate (births per woman)' }
}

const BASE_URL = 'https://api.worldbank.org/v2/country'
const COUNTRY_PATH = COUNTRIES.map((c) => c.code).join(';')

async function fetchIndicator(indicatorCode) {
  const url = `${BASE_URL}/${COUNTRY_PATH}/indicator/${indicatorCode}?format=json&date=1968:2023&per_page=1000`
  let res
  try {
    res = await fetch(url)
  } catch (e) {
    throw new Error(`Could not reach the World Bank API: ${e.message}`)
  }
  if (!res.ok) throw new Error(`World Bank API request failed (HTTP ${res.status})`)
  const json = await res.json()
  return json[1] ?? []
}

export async function fetchInternationalComparison() {
  const entries = Object.entries(INDICATORS)
  let results
  try {
    results = await Promise.all(entries.map(([, ind]) => fetchIndicator(ind.code)))
  } catch (e) {
    throw new Error(`Couldn't load international comparison data: ${e.message}`)
  }

  const byIndicator = {}
  entries.forEach(([key, ind], i) => {
    const rows = results[i]
    // Years present for ANY country, sorted — World Bank sometimes lags
    // one country's most recent year behind another's.
    const years = [...new Set(rows.map((r) => Number(r.date)))].sort((a, b) => a - b)
    const yearIndex = new Map(years.map((y, idx) => [y, idx]))
    const byCountry = {}
    for (const c of COUNTRIES) byCountry[c.code] = years.map(() => null)
    for (const r of rows) {
      if (r.value == null) continue
      const idx = yearIndex.get(Number(r.date))
      if (idx == null || !(r.countryiso3code in byCountry)) continue
      byCountry[r.countryiso3code][idx] = r.value
    }
    byIndicator[key] = { label: ind.label, years, byCountry }
  })

  return {
    countries: COUNTRIES,
    indicators: INDICATORS,
    byIndicator,
    source: 'World Bank Open Data (api.worldbank.org)'
  }
}
