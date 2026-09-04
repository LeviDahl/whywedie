// Backfills the general fertility rate (births per 1,000 women aged
// 15-44) for years past WONDER's coverage, using the Census Bureau's
// Population Estimates Program (PEP) as the population denominator.
// Births themselves still come from WONDER (D66/D192, already in the
// `natality` table) — this script only fills `population` /
// `fertility_rate` for rows that have a birth_count but no rate yet, and
// never touches a year WONDER already finalized.
//
//   node --env-file=.env fetch-census-fertility.js
//   node --env-file=.env fetch-census-fertility.js --dry-run
//   node --env-file=.env fetch-census-fertility.js --out=rows.json
//   node --env-file=.env fetch-census-fertility.js --vintage=2023
//
// Needs CENSUS_API_KEY in the environment (pipeline/.env) — get a free one
// at https://api.census.gov/data/key_signup.html. Not a WONDER dataset, so
// this is a standalone script rather than a fetch.js --type/--era chunk;
// see lib/census.js for the API client and its notes on the response shape.

import { parseArgs } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { findLatestVintage, fetchWomen15to44 } from './lib/census.js'
import { query, closePool } from './lib/db.js'
import * as log from './lib/log.js'

const HELP = `
whywedie pipeline — backfill general fertility rate from Census PEP.

  node --env-file=.env fetch-census-fertility.js [options]

options:
  --vintage=YYYY   use this PEP vintage instead of auto-detecting the latest
  --dry-run        show what would be written, touch nothing
  --out=path       write {year, population, fertilityRate} rows to JSON
                   instead of the database (no DB connection made)
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
        'and run with `node --env-file=.env fetch-census-fertility.js`.'
    )
  }

  const vintage = values.vintage ? Number(values.vintage) : await findLatestVintage(apiKey)
  log.info(`Census PEP vintage: ${vintage}`)

  const population = await fetchWomen15to44(vintage, apiKey)
  const years = [...population.keys()].sort((a, b) => a - b)
  log.info(`women 15-44 (national, July 1): ${years.map((y) => `${y}=${population.get(y)}`).join(', ')}`)

  if (values.out) {
    const rows = years.map((y) => ({ year: y, population: population.get(y) }))
    await writeFile(values.out, JSON.stringify(rows, null, 2))
    log.info(`--out: wrote ${rows.length} rows to ${values.out} (database not touched)`)
    return
  }

  if (values['dry-run']) {
    log.info('--dry-run: would update the `natality` table for the years above. Nothing sent.')
    return
  }

  let updated = 0
  let skipped = 0
  try {
    for (const year of years) {
      const pop = population.get(year)
      const [existing] = await query(
        `SELECT birth_count, fertility_rate FROM natality WHERE year = ? AND state_code = 'US'`,
        [year]
      )
      if (!existing || existing.birth_count == null) {
        log.warn(`  ${year}: no birth_count in \`natality\` yet — skipped (run the natality WONDER eras first)`)
        skipped++
        continue
      }
      if (existing.fertility_rate != null) {
        log.info(`  ${year}: already has a fertility_rate (WONDER-sourced) — left alone`)
        skipped++
        continue
      }
      const fertilityRate = Math.round((existing.birth_count / pop) * 1000 * 100) / 100
      await query(
        `UPDATE natality
            SET population = ?, fertility_rate = ?
          WHERE year = ? AND state_code = 'US' AND fertility_rate IS NULL AND birth_count IS NOT NULL`,
        [pop, fertilityRate, year]
      )
      log.info(`  ${year}: population=${pop} births=${existing.birth_count} -> fertility_rate=${fertilityRate}`)
      updated++
    }
  } finally {
    await closePool()
  }

  log.summary('done', { elapsed: log.elapsed(), updated, skipped })
}

main().catch((err) => {
  log.error(err.message)
  process.exitCode = 1
})
