// One operational chunk of the WONDER -> MySQL pipeline.
//
//   node --env-file=.env fetch.js --type=mortality --era=icd10
//   node --env-file=.env fetch.js --type=natality  --era=modern
//
// Each invocation handles exactly one (type, era) so a single run stays
// small and one failure doesn't take the others down. Cron (or a scheduled
// CI workflow) runs the six chunks separately, then build-snapshots.js.
// See pipeline/README.md for where this runs and how it reaches the DB.
//
// Options:
//   --type=<mortality|natality>     required
//   --era=<icd10|icd9|icd8|modern|mid|old>   required
//   --years=YYYY-YYYY               slice one era into a smaller request;
//                                   only works if the template has a
//                                   {{YEAR_LIST}} token
//   --dry-run                       resolve the template and print it; no POST
//   --dump                          also write the raw WONDER response XML
//                                   (default name <type>_<era>.raw.xml;
//                                   override with --dump-path=FILE)
//   --out=path                      write mapped rows as JSON to `path`
//                                   instead of upserting to MySQL (offline
//                                   testing — no DB connection made)
//   --help

import { parseArgs } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { resolveDataset } from './lib/datasets.js'
import { loadTemplate } from './lib/templates.js'
import { postRequest } from './lib/wonder.js'
import { parseTable } from './lib/parseResponse.js'
import { mapGrid } from './lib/mapRows.js'
import * as log from './lib/log.js'

const HELP = `
whywedie pipeline — fetch one dataset chunk from CDC WONDER.

  node --env-file=.env fetch.js --type=<mortality|natality> --era=<era> [options]

eras:  mortality -> icd10 (D176), icd9 (D16), icd8 (D15)
       natality  -> modern (D149), mid (D66), old (D27)

options:
  --years=YYYY-YYYY   sub-slice (needs {{YEAR_LIST}} in the template;
                     defaults to the era's full nominal span)
  --dry-run          print the resolved request XML, do not send it
  --dump             save the raw WONDER response XML (<type>_<era>.raw.xml)
  --dump-path=FILE   ... to a specific path
  --out=path         write mapped rows to JSON instead of the database
  --help
`

async function main() {
  const { values } = parseArgs({
    options: {
      type: { type: 'string' },
      era: { type: 'string' },
      years: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      dump: { type: 'boolean', default: false },
      'dump-path': { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: false,
    strict: true,
  })

  if (values.help || !values.type || !values.era) {
    console.log(HELP)
    process.exitCode = values.help ? 0 : 1
    return
  }

  const dataset = resolveDataset(values.type, values.era)
  log.info(
    `dataset: ${dataset.type}/${dataset.era}  db=${dataset.databaseId}  ` +
      `table=${dataset.table}  cols=${dataset.columns.length}`
  )

  // ---- template ---------------------------------------------------------
  // If a template carries a {{YEAR_LIST}} token, fill it with --years when
  // given, otherwise the dataset's full nominal span. --years on a template
  // without the token is a no-op (warned below).
  const yearsArg = values.years || `${dataset.yearMin}-${dataset.yearMax}`
  const { xml, path, meta } = await loadTemplate(dataset.templateFile, {
    years: yearsArg,
  })
  log.info(`template: ${path}`)
  if (meta.consentInjected) log.info('  injected accept_datause_restrictions=true')
  if (values.years && !meta.yearTokenPresent) {
    log.warn(
      `--years=${values.years} ignored: ${dataset.templateFile} has no ${'{{YEAR_LIST}}'} token. ` +
        `Using the template's own year filter.`
    )
  }
  if (meta.yearsApplied) {
    log.info(
      `  filled {{YEAR_LIST}} with ${yearsArg}` +
        (values.years ? ' (--years)' : ' (dataset nominal span)')
    )
  }

  if (values['dry-run']) {
    log.info('--dry-run: resolved request XML follows, nothing sent.\n')
    console.log(xml)
    return
  }

  // ---- fetch ----------------------------------------------------------
  log.info(`POST ${dataset.databaseId} ...`)
  const raw = await postRequest(dataset.databaseId, xml)
  log.info(`  received ${raw.length.toLocaleString()} bytes`)

  if (values.dump || values['dump-path']) {
    const dumpPath = values['dump-path'] || `${dataset.type}_${dataset.era}.raw.xml`
    await writeFile(dumpPath, raw)
    log.info(`  raw response written to ${dumpPath}`)
  }

  // ---- parse + map --------------------------------------------------
  const { grid, rawRowCount } = parseTable(raw, dataset.columns.length)
  log.info(`parsed ${rawRowCount} table rows`)

  const { rows, stats } = mapGrid(grid, dataset)
  log.info(
    `mapped ${stats.mapped} rows  (skipped ${stats.skipped} non-data rows, ` +
      `${stats.suppressed} suppressed counts)`
  )

  if (rows.length) {
    const years = rows.map((r) => r.year)
    const lo = Math.min(...years)
    const hi = Math.max(...years)
    log.info(`  year range in response: ${lo}-${hi} (dataset nominal ${dataset.yearMin}-${dataset.yearMax})`)
  } else {
    log.warn('no data rows mapped — check the template grouping/measures against datasets.js columns')
  }

  // ---- sink -------------------------------------------------------
  if (values.out) {
    await writeFile(values.out, JSON.stringify(rows, null, 2))
    log.info(`--out: wrote ${rows.length} rows to ${values.out} (database not touched)`)
    log.summary('done', { elapsed: log.elapsed(), rows: rows.length })
    return
  }

  const { batchUpsert, closePool } = await import('./lib/db.js')
  try {
    const result = await batchUpsert(dataset.table, rows)
    log.summary('done', {
      elapsed: log.elapsed(),
      table: dataset.table,
      rowsSent: result.rowsSent,
      rowsAffected: result.affected,
      batches: result.batches,
      suppressed: stats.suppressed,
    })
  } finally {
    await closePool()
  }
}

main().catch((err) => {
  log.error(err.stack || err.message)
  process.exitCode = 1
})
