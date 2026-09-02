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

import { mkdir, writeFile, readFile } from 'node:fs/promises'
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

async function buildMortalityDemographic() {
  const rows = await query(
    `SELECT year, icd_version, cause_code, cause_name, cause_level, dimension,
            subgroup, death_count, population, crude_rate, age_adjusted_rate,
            suppressed
       FROM mortality_demographic
      WHERE state_code = 'US'
      ORDER BY dimension ASC, year ASC, death_count DESC`
  ).catch((err) => {
    // table not created yet — not fatal, just skip this snapshot
    if (/doesn'?t exist|Unknown table|no such table/i.test(err.message)) return []
    throw err
  })
  if (rows.length === 0) return { file: null, count: 0 }

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b)
  const dimensions = {}

  for (const r of rows) {
    const dim = (dimensions[r.dimension] ||= {
      subgroups: [],
      byYear: {},
      byCause: {},
    })
    if (!dim.subgroups.includes(r.subgroup)) dim.subgroups.push(r.subgroup)

    const leading =
      typeof r.cause_code === 'string' && r.cause_code.startsWith('#')

    ;(dim.byYear[r.year] ||= []).push({
      cause: r.cause_code,
      causeName: r.cause_name,
      leading,
      subgroup: r.subgroup,
      deaths: r.death_count,
      population: r.population,
      crudeRate: r.crude_rate,
      ageAdjustedRate: r.age_adjusted_rate,
      suppressed: Boolean(r.suppressed),
    })

    const c = (dim.byCause[r.cause_code] ||= {
      name: r.cause_name,
      level: r.cause_level,
      leading,
      subgroups: {},
    })
    const s = (c.subgroups[r.subgroup] ||= {
      years: [],
      deaths: [],
      crudeRate: [],
      ageAdjustedRate: [],
    })
    s.years.push(r.year)
    s.deaths.push(r.death_count)
    s.crudeRate.push(r.crude_rate)
    s.ageAdjustedRate.push(r.age_adjusted_rate)
  }

  for (const dim of Object.values(dimensions)) dim.subgroups.sort()

  const payload = {
    source: MORTALITY_SOURCE,
    fetchedAt: new Date().toISOString(),
    coverage: {
      yearMin: years[0],
      yearMax: years[years.length - 1],
      note:
        'National only. D76 grouped by Year x NCHS 113-cause list x ' +
        '{Gender | Race}. WONDER suppresses subgroup cells with 1-9 deaths, ' +
        'so rarer causes have missing subgroups. Compare races on the ' +
        'age-adjusted rate — crude rate mostly reflects age structure.',
    },
    years,
    dimensions,
  }
  return { file: payload, count: rows.length }
}

async function buildNatality(outDir) {
  const rows = await query(
    `SELECT year, birth_count, population, birth_rate, fertility_rate, suppressed
       FROM natality
      WHERE state_code = 'US'
      ORDER BY year ASC`
  )
  if (rows.length === 0) return { file: null, count: 0 }

  // The WONDER natality databases wired so far start at 2003. Merge the
  // committed Socrata baseline (usually 1960-2018) so pre-2003 history
  // survives — DB rows win for any year they cover.
  const byYear = {}
  try {
    const base = JSON.parse(await readFile(join(outDir, 'natality.json'), 'utf8'))
    for (const [y, v] of Object.entries(base.byYear ?? {})) byYear[y] = v
    log.info(`  merged ${Object.keys(byYear).length} baseline natality years`)
  } catch {
    /* no baseline present — fine */
  }

  for (const r of rows) {
    byYear[r.year] = {
      births: r.birth_count,
      population: r.population,
      birthRate: r.birth_rate ?? byYear[r.year]?.birthRate ?? null,
      fertilityRate: r.fertility_rate,
      suppressed: Boolean(r.suppressed),
    }
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b)

  const payload = {
    source: NATALITY_SOURCE,
    fetchedAt: new Date().toISOString(),
    coverage: {
      yearMin: years[0],
      yearMax: years[years.length - 1],
      note:
        'National totals only. Pre-2003 years are the committed Socrata ' +
        'baseline (NCHS Natality Measures by Race); 2003+ is from WONDER ' +
        '(D27 2003-2006, D66 2007-2022, D192 provisional 2023+). Fertility ' +
        'rate = births per 1,000 women aged 15-44; the newest D192 year is ' +
        'partial and provisional.',
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
  const mortalityDemographic = await buildMortalityDemographic()
  const natality = await buildNatality(outDir)

  const sources = {}
  for (const [type, eras] of Object.entries(DATASETS)) {
    sources[type] = []
    for (const [era, ds] of Object.entries(eras)) {
      let n = 0
      let ymin = null
      let ymax = null
      try {
        const where =
          `WHERE state_code = 'US'` +
          (ds.fixed?.icd_version ? ` AND icd_version = ${Number(ds.fixed.icd_version)}` : '') +
          (ds.fixed?.dimension ? ` AND dimension = ${JSON.stringify(ds.fixed.dimension)}` : '')
        const [agg] = await query(
          `SELECT COUNT(*) n, MIN(year) ymin, MAX(year) ymax FROM \`${ds.table}\` ${where}`
        )
        ;({ n, ymin, ymax } = agg)
      } catch (err) {
        if (!/doesn'?t exist|Unknown table|no such table/i.test(err.message)) throw err
      }
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
    mortalityDemographic.file && ['mortality_demographic.json', mortalityDemographic.file],
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
