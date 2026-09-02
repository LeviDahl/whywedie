// Tiny CSV helpers — no dependency.

function esc(v) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * @param {string[]} columns
 * @param {Array<Array|Object>} rows  array-of-arrays, or objects keyed by column name
 */
export function toCsv(columns, rows) {
  const head = columns.map(esc).join(',')
  const body = rows
    .map((r) =>
      (Array.isArray(r) ? r : columns.map((c) => r[c])).map(esc).join(',')
    )
    .join('\n')
  return `${head}\n${body}\n`
}

export function downloadCsv(filename, columns, rows) {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`
  const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
