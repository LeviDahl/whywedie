// One-time (idempotent) schema setup.
//
//   node --env-file=.env apply-schema.js
//
// Reads schema.sql and runs it against the pipeline database. Safe to re-run
// — every statement is CREATE TABLE IF NOT EXISTS and touches no data.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { applySchema, closePool } from './lib/db.js'
import * as log from './lib/log.js'

const here = dirname(fileURLToPath(import.meta.url))

try {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8')
  log.info('Applying schema.sql ...')
  await applySchema(sql)
  log.info(`Schema applied OK (${log.elapsed()}).`)
} catch (err) {
  log.error(err.message)
  process.exitCode = 1
} finally {
  await closePool()
}
