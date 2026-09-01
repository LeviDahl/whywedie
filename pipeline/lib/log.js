// Minimal timestamped logging + a run summary. No dependency.

const started = Date.now()

function stamp() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '')
}

export function info(...args) {
  console.log(`[${stamp()}]`, ...args)
}

export function warn(...args) {
  console.warn(`[${stamp()}] WARN`, ...args)
}

export function error(...args) {
  console.error(`[${stamp()}] ERROR`, ...args)
}

export function elapsed() {
  const s = (Date.now() - started) / 1000
  return `${s.toFixed(1)}s`
}

/** Print a labelled key/value block, e.g. the end-of-run summary. */
export function summary(title, obj) {
  const width = Math.max(...Object.keys(obj).map((k) => k.length))
  info(title)
  for (const [k, v] of Object.entries(obj)) {
    console.log(`    ${k.padEnd(width)}  ${v}`)
  }
}
