// Total US population by Census region (Northeast/Midwest/South/West),
// annually since 2010 — powers the population-trend chart on State
// Comparison ("Midwest has shrunk since 2010, the South has grown").
//
// Two Census PEP tables stitched together (see lib/census.js):
//   - 2010-2019: the legacy `2019/pep/population` table (frozen, no new
//     vintages — Census replaced this design after the 2020 Census).
//   - 2020-present: the modern `pep/charv` table (the same one
//     fetch-census-fertility.js uses), auto-detecting the latest
//     published vintage.
// Both expose `region` as a direct geography level, so these are real
// Census region totals — not an average we derive ourselves, unlike the
// state-rate rollup on this same page (that source has no population to
// weight by; this one *is* population, so it's an exact sum).
//
// Not a WONDER dataset, so this is a standalone script rather than a
// fetch.js --type/--era chunk. Writes straight to a JSON file — there's
// no natural DB table for 4 regions x ~15 years, so (unlike
// fetch-census-fertility.js, which merges into the `natality` table)
// this skips the database entirely and drops its output next to
// build-snapshots.js's own files, so the existing publish step (copy
// $SNAPSHOT_OUT_DIR to public_html/data) picks it up with no extra step.
//
//   node --env-file=.env fetch-census-population.js
//   node --env-file=.env fetch-census-population.js --dry-run
//   node --env-file=.env fetch-census-population.js --out=population_by_region.json
//
// Needs CENSUS_API_KEY in the environment (pipeline/.env).

import { parseArgs } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findLatestVintage, fetchRegionPopulation, fetchLegacyRegionPopulation } from './lib/census.js'
import { getSnapshotOutDir } from './lib/config.js'
import * as log from './lib/log.js'

const HELP = `
whywedie pipeline — fetch US population by Census region since 2010.

  node --env-file=.env fetch-census-population.js [options]

options:
  --vintage=YYYY   use this PEP vintage for the 2020+ data instead of
                   auto-detecting the latest published one
  --dry-run        fetch and log, write nothing
  --out=path       write to this path instead of $SNAPSHOT_OUT_DIR/population_by_region.json
  --help
`

async function main() {
  const { values } = parseArgs({
    options: {
      vintage: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      out: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  })
  if (values.help) {
    console.log(HELP)
    return
  }

  const apiKey = process.env.CENSUS_API_KEY
  if (!apiKey) {
    throw new Error(
      'Missing CENSUS_API_KEY. Get a free key at ' +
        'https://api.census.gov/data/key_signup.html, add it to pipeline/.env, ' +
        'and run with `node --env-file=.env fetch-census-population.js`.'
    )
  }

  const vintage = values.vintage ? Number(values.vintage) : await findLatestVintage(apiKey)
  log.info(`Census PEP vintage (2020+ data): ${vintage}`)

  const [legacy, modern] = await Promise.all([
    fetchLegacyRegionPopulation(apiKey),
    fetchRegionPopulation(vintage, apiKey),
  ])

  // Modern wins on any year both cover (shouldn't overlap in practice —
  // legacy stops at 2019, modern starts at 2020 — but be explicit).
  const byYear = new Map([...legacy, ...modern])
  const years = [...byYear.keys()].sort((a, b) => a - b)
  const regions = ['Northeast', 'Midwest', 'South', 'West']

  for (const year of years) {
    const row = byYear.get(year)
    log.info(`  ${year}: ${regions.map((r) => `${r}=${row.get(r)?.toLocaleString() ?? '—'}`).join(', ')}`)
  }

  const payload = {
    source:
      'US Census Bureau, Population Estimates Program (PEP) — resident population by ' +
      'Census region, July 1 estimates (data.census.gov)',
    fetchedAt: new Date().toISOString(),
    coverage: {
      yearMin: years[0],
      yearMax: years[years.length - 1],
      note:
        'US Census Bureau region totals (Northeast, Midwest, South, West), July 1 resident ' +
        'population estimates. 2010-2019 from the legacy pep/population table; 2020+ from ' +
        `pep/charv vintage ${vintage}. Real totals (a Census-published sum), not an average.`,
    },
    regions,
    years,
    byYear: Object.fromEntries(
      years.map((y) => [y, Object.fromEntries(regions.map((r) => [r, byYear.get(y).get(r) ?? null]))])
    ),
  }

  if (values['dry-run']) {
    log.info(`--dry-run: would write ${years.length} years to population_by_region.json. Nothing written.`)
    return
  }

  const outPath = values.out ?? join(getSnapshotOutDir(), 'population_by_region.json')
  await writeFile(outPath, JSON.stringify(payload))
  log.summary('done', { elapsed: log.elapsed(), years: years.length, wrote: outPath })
}

main().catch((err) => {
  log.error(err.stack || err.message)
  process.exitCode = 1
})
