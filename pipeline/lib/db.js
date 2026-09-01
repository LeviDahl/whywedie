// MySQL access for the pipeline. One shared pool; batched upserts.
//
// This connects to the cPanel database OVER THE NETWORK — see config.js. If
// a connection error comes back it's almost always the cPanel > Remote MySQL
// allow-list or SSL, so those errors are annotated with what to check.
//
// The upsert is a multi-row
//   INSERT INTO <table> (<cols>) VALUES (...),(...),...
//   ON DUPLICATE KEY UPDATE col = VALUES(col), ...
// The VALUES(col) form (rather than the MySQL 8.0.20+ alias form) is used
// deliberately so this works on both MySQL and the MariaDB build GoDaddy may
// be running.

import mysql from 'mysql2/promise'
import { getDbConfig, dbBatchSize } from './config.js'
import { TABLE_COLUMNS, UPSERT_UPDATE_COLUMNS } from './datasets.js'
import * as log from './log.js'

let pool

export function getPool() {
  if (!pool) {
    const cfg = getDbConfig()
    log.info(
      `db: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database} ` +
        `ssl=${cfg.ssl ? (cfg.ssl.rejectUnauthorized ? 'verify' : 'skip-verify') : 'off'}`
    )
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.ssl,
      connectTimeout: cfg.connectTimeout,
      waitForConnections: true,
      connectionLimit: cfg.connectionLimit,
      charset: cfg.charset,
      // required for apply-schema.js (schema.sql has several statements)
      multipleStatements: true,
      // don't turn every DECIMAL into a JS string
      decimalNumbers: true,
    })
  }
  return pool
}

/** Wrap low-level connection failures with the likely cPanel cause. */
export function explainDbError(err) {
  const hints = {
    ETIMEDOUT:
      'Connection timed out. Add this machine\'s public IP to cPanel > Remote MySQL, ' +
      'and confirm the host/port are the cPanel server (not localhost).',
     ECONNREFUSED:
      'Connection refused. Wrong host/port, or the DB server does not accept remote TCP.',
    ENOTFOUND: 'DB_HOST does not resolve. Use the cPanel server hostname.',
    ER_ACCESS_DENIED_ERROR:
      'Access denied. Check DB_USER / DB_PASSWORD and that the user is added to the ' +
      'database in cPanel with SELECT,INSERT,UPDATE,CREATE,INDEX.',
    ER_HOST_NOT_PRIVILEGED:
      'This host is not allowed to connect. Add its public IP in cPanel > Remote MySQL ' +
      '(GoDaddy shared hosting may forbid remote MySQL entirely on some plans).',
    HANDSHAKE_NO_SSL_SUPPORT:
      'The server has TLS disabled, so no DB_SSL value works — unset DB_SSL ' +
      'entirely for a plaintext connection. If an encrypted link matters, ' +
      'tunnel through SSH and point DB_HOST at 127.0.0.1.',
  }
  const hint = hints[err.code]
  if (hint) err.message = `${err.message}\n  -> ${hint}`
  return err
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}

/**
 * Upsert normalized rows into `table`. Rows are plain objects keyed by DB
 * column; any column absent from a row is written as NULL (or its schema
 * default for the two NOT NULL DEFAULT columns).
 *
 * @returns {Promise<{rowsSent:number, affected:number, batches:number}>}
 */
export async function batchUpsert(table, rows) {
  const cols = TABLE_COLUMNS[table]
  const updateCols = UPSERT_UPDATE_COLUMNS[table]
  if (!cols) throw new Error(`batchUpsert: unknown table "${table}"`)
  if (rows.length === 0) return { rowsSent: 0, affected: 0, batches: 0 }

  const colList = cols.map((c) => `\`${c}\``).join(', ')
  const updateList = updateCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ')
  const p = getPool()

  let affected = 0
  let batches = 0
  const size = Math.max(1, dbBatchSize)

  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size)
    const values = slice.map((r) =>
      cols.map((c) => (r[c] === undefined ? null : r[c]))
    )
    const placeholders = values.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ')
    const sql =
      `INSERT INTO \`${table}\` (${colList}) VALUES ${placeholders} ` +
      `ON DUPLICATE KEY UPDATE ${updateList}`

    let result
    try {
      ;[result] = await p.query(sql, values.flat())
    } catch (err) {
      throw explainDbError(err)
    }
    affected += result.affectedRows ?? 0
    batches += 1
    log.info(
      `  batch ${batches}: ${slice.length} rows sent, ${result.affectedRows} affected` +
        ` (${i + slice.length}/${rows.length})`
    )
  }

  return { rowsSent: rows.length, affected, batches }
}

export async function applySchema(sqlText) {
  try {
    await getPool().query(sqlText)
  } catch (err) {
    throw explainDbError(err)
  }
}

/** small helper for build-snapshots.js */
export async function query(sql, params = []) {
  try {
    const [rows] = await getPool().query(sql, params)
    return rows
  } catch (err) {
    throw explainDbError(err)
  }
}
