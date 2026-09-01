// Runtime configuration, read from the environment only.
//
// No secret is ever read from a file tracked in this repo. Values come from
// the environment: a gitignored pipeline/.env loaded with
// `node --env-file=.env`, or the host's own secret/env-var mechanism
// (a PaaS "secrets" panel, GitHub Actions secrets, systemd, etc.). This
// module only reads process.env.
//
// The pipeline connects to the cPanel MySQL database OVER THE NETWORK
// (cPanel has no Node runtime, so fetch.js runs elsewhere). That means:
//   - DB_HOST is the cPanel server's hostname, not "localhost"
//   - the runner's public IP must be allow-listed in cPanel > Remote MySQL
//   - DB_SSL should be on for anything crossing the public internet
//
// DB validation is LAZY (getDbConfig / getSnapshotOutDir) so the offline
// paths — `fetch.js --dry-run`, `fetch.js --out=...`, `node --check` — work
// with no database env vars set.

function required(name) {
  const value = process.env[name]
  if (value === undefined || value === '' || String(value).startsWith('REPLACE')) {
    throw new Error(
      `Missing required env var ${name}. Copy pipeline/.env.example to ` +
        `pipeline/.env, fill it in, and run with \`node --env-file=.env <script>\` ` +
        `(or provide it through the host's secrets/env mechanism).`
    )
  }
  return value
}

function optional(name, fallback) {
  const value = process.env[name]
  return value === undefined || value === '' ? fallback : value
}

function bool(name, fallback = false) {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  return /^(1|true|yes|on)$/i.test(v)
}

// --- eager, no-throw (safe to import anywhere) ---------------------------

export const wonderBaseUrl = optional(
  'WONDER_BASE_URL',
  'https://wonder.cdc.gov/controller/datarequest'
)

export const wonderTimeoutMs = Number(optional('WONDER_TIMEOUT_MS', '120000'))

export const templateDir = optional('TEMPLATE_DIR', './templates')

export const dbBatchSize = Number(optional('DB_BATCH_SIZE', '1000'))

// --- lazy, throws only when actually needed -----------------------------

export function getDbConfig() {
  // DB_SSL:  off/unset      -> no TLS (only ok for localhost)
  //          "true"/"1"/... -> TLS, verify the server certificate
  //          "skip-verify"  -> TLS, do NOT verify (GoDaddy shared-hosting
  //                            certs usually don't match the DB hostname)
  const sslMode = optional('DB_SSL', '')
  let ssl
  if (/^skip[-_]?verify$/i.test(sslMode)) ssl = { rejectUnauthorized: false }
  else if (/^(1|true|yes|on)$/i.test(sslMode)) ssl = { rejectUnauthorized: true }

  return {
    host: optional('DB_HOST', 'localhost'),
    port: Number(optional('DB_PORT', '3306')),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    ssl,
    connectTimeout: Number(optional('DB_CONNECT_TIMEOUT_MS', '20000')),
    connectionLimit: 4,
    charset: 'utf8mb4',
  }
}

export function getSnapshotOutDir() {
  return required('SNAPSHOT_OUT_DIR')
}

export { bool }
