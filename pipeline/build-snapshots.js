// Reads the pipeline database and writes the static JSON the Vue site loads
// at /data/*.json . Run after the fetch chunks (last cron entry):
//
//   node --env-file=.env build-snapshots.js
//
// Output dir = $SNAPSHOT_OUT_DIR, a LOCAL directory on the pipeline host.
// A separate step publishes it into the site's public_html/data (see
// pipeline/README.md "Publishing snapshots"). Files are minified.
//
// Shapes deliberately echo src/api/causesOfDeath.js (years / causes / byYear
// / byCause) so the coming frontend switch from Socrata to these snapshots
// is a small change.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { query, closePool } from './lib/db.js'
import { DATASETS } from './lib/datasets.js'
import { getSnapshotOutDir } from './lib/config.js'
import * as log from './lib/log.js'

const MORTALITY_SOURCE =
  'CDC WONDER (wonder.cdc.gov) — Underlying Cause of Death, national (API is national-only)'
const NATALITY_SOURCE =
  'CDC WONDER (wonder.cdc.gov) — Natality, national (API is national-only)'

async function buildMortality() {
  const rows = await query(
    `SELECT year, icd_version, cause_code, cause_name, cause_level,
            death_count, population, crude_rate, age_adjusted_rate, suppressed
       FROM mortality
      WHERE state_code = 'US'
      ORDER BY year ASC, death_count DESC`
  )
  if (rows.length === 0) return { file: null, count: 0 }

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b)
  const icdVersions = [...new Set(rows.map((r) => r.icd_version))].sort((a, b) => a - b)

  const causeKey = (r) => `${r.icd_version}:${r.cause_code}`
  const causesMap = new Map()
  const byYear = {}
  const byCause = {}

  for (const r of rows) {
    const point = {
      code: r.cause_code,
      name: r.cause_name,
      level: r.cause_level,
      leading: typeof r.cause_code === 'string' && r.cause_code.startsWith('#'),
      icdVersion: r.icd_version,
      deaths: r.death_count,
      population: r.population,
      crudeRate: r.crude_rate,
      ageAdjustedRate: r.age_adjusted_rate,
      suppressed: Boolean(r.suppressed),
    }

    ;(byYear[r.year] ||= []).push(point)

    if (!causesMap.has(causeKey(r))) {
      causesMap.set(causeKey(r), {
        code: r.cause_code,
        name: r.cause_name,
        level: r.cause_level,
        leading: point.leading,
        icdVersion: r.icd_version,
      })
    }

    const c = (byCause[causeKey(r)] ||= {
      code: r.cause_code,
      name: r.cause_name,
      level: r.cause_level,
      leading: point.leading,
      icdVersion: r.icd_version,
      years: [],
      deaths: [],
      crudeRate: [],
      ageAdjustedRate: [],
    })
    c.years.push(r.year)
    c.deaths.push(r.death_count)
    c.crudeRate.push(r.crude_rate)
    c.ageAdjustedRate.push(r.age_adjusted_rate)
  }

  const payload = {
    source: MORTALITY_SOURCE,
    fetchedAt: new Date().toISOString(),
    coverage: {
      yearMin: years[0],
      yearMax: years[years.length - 1],
      icdVersions,
      note:
        'National totals only. The CDC WONDER API does not return ' +
        'Region/Division/State/County data for vital statistics. Cause codes ' +
        'are the NCHS 113 Selected Causes list for ICD-10 and ICD-9; ICD-8 ' +
        'uses a coarser cause recode. Compare within an ICD version, not across.',
    },
    years,
    causes: [...causesMap.values()],
    byYear,
    byCause,
  }

  return { file: payload, count: rows.length }
}

async function buildNatality() {
  const rows = await query(
    `SELECT year, birth_count, population, birth_rate, suppressed
       FROM natality
      WHERE state_code = 'US'
      ORDER BY year ASC`
  )
  if (rows.length === 0) return { file: null, count: 0 }

  const years = rows.map((r) => r.year)
  const byYear = {}
  for (const r of rows) {
    byYear[r.year] = {
      births: r.birth_count,
      population: r.population,
      birthRate: r.birth_rate,
      suppressed: Boolean(r.suppressed),
    }
  }

  const payload = {
    source: NATALITY_SOURCE,
    fetchedAt: new Date().toISOString(),
    coverage: {
      yearMin: years[0],
      yearMax: years[years.length - 1],
      note:
        'National totals only. Built from WONDER natality databases D149 ' +
        '(2016+), D66 (2007-2015) and D27 (1995-2002); years 2003-2006 are ' +
        'not covered by that set of databases.',
    },
    years,
    byYear,
  }

  return { file: payload, count: rows.length }
}

async function main() {
  const outDir = getSnapshotOutDir()
  await mkdir(outDir, { recursive: true })
  log.info(`output dir: ${outDir}`)

  const mortality = await buildMortality()
  const natality = await buildNatality()

  const sources = {}
  for (const [type, eras] of Object.entries(DATASETS)) {
    sources[type] = []
    for (const [era, ds] of Object.entries(eras)) {
      const [{ n, ymin, ymax }] = await query(
        `SELECT COUNT(*) n, MIN(year) ymin, MAX(year) ymax FROM \`${ds.table}\`
          WHERE state_code = 'US'` +
          (type === 'mortality' ? ` AND icd_version = ${Number(ds.fixed.icd_version)}` : '')
      )
      sources[type].push({
        era,
        databaseId: ds.databaseId,
        rows: n,
        yearMin: ymin,
        yearMax: ymax,
        nominalYearMin: ds.yearMin,
        nominalYearMax: ds.yearMax,
      })
    }
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    pipeline: 'whywedie-pipeline',
    sources,
    caveats: [
      'CDC WONDER API returns national vital-statistics data only.',
      'Counts 1-9 are suppressed by CDC and stored as null with suppressed=true.',
      'Mortality cause codes: NCHS 113-cause list (ICD-10, ICD-9); coarser recode for ICD-8.',
    ],
  }

  const writes = [
    ['meta.json', meta],
    mortality.file && ['mortality.json', mortality.file],
    natality.file && ['natality.json', natality.file],
  ].filter(Boolean)

  for (const [name, data] of writes) {
    const path = join(outDir, name)
    await writeFile(path, JSON.stringify(data))
    log.info(`wrote ${name} (${JSON.stringify(data).length.toLocaleString()} bytes)`)
  }

  log.summary('done', {
    elapsed: log.elapsed(),
    mortalityRows: mortality.count,
    natalityRows: natality.count,
    files: writes.length,
  })
}

main()
  .catch((err) => {
    log.error(err.stack || err.message)
    process.exitCode = 1
  })
  .finally(closePool)
