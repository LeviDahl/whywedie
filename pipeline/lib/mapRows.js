// Maps a parsed WONDER grid (from parseResponse.js) into normalized row
// objects ready for the `mortality` / `natality` upsert, using the dataset's
// `columns` contract from datasets.js.
//
// WONDER writes non-numeric flags into measure cells:
//   "Suppressed"      counts 1-9 withheld for confidentiality  -> NULL
//   "Unreliable"      rate based on < 20 events                 -> NULL
//   "Not Applicable"  measure undefined for this cell          -> NULL
//   "Missing"         source value absent                      -> NULL
// When such a flag lands on the count field the row is marked suppressed and
// the flag is kept in `status` so the frontend can say so honestly rather
// than render a fake 0.

const NON_NUMERIC_FLAGS = new Set([
  'Suppressed',
  'Unreliable',
  'Not Applicable',
  'Missing',
  'Not Available',
])

export function mapGrid(grid, dataset) {
  const { columns, fixed = {}, table } = dataset
  const rows = []
  let skipped = 0
  let suppressed = 0

  for (const cells of grid) {
    // a row not filled to the full column width is a totals / caption
    // artifact from WONDER — drop it.
    if (cells.length < columns.length || cells.some((c) => c === undefined)) {
      skipped += 1
      continue
    }

    const row = {
      state_code: 'US',
      suppressed: 0,
      status: null,
      ...fixed,
    }
    let badYear = false

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      const cell = cells[i]

      if (col.kind === 'year') {
        // a rowspanned year cell may carry only the label (l=), no v=
        const y = parseInt(String(cell.value || cell.label).replace(/[^\d]/g, ''), 10)
        if (!Number.isInteger(y) || y < 1900 || y > 2100) {
          badYear = true
          break
        }
        row.year = y
        continue
      }

      if (col.kind === 'month') {
        // WONDER month grouping can come back as "Jan., 2021" / "January" /
        // a "2021/01" code / a bare 1-12.
        const raw = String(cell.value || cell.label || '').trim()
        let mo = null
        const code = raw.match(/^\d{4}[/-](\d{1,2})\b/)
        if (code) mo = parseInt(code[1], 10)
        if (mo == null) {
          const names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
          const i = names.findIndex((n) => raw.toLowerCase().startsWith(n))
          if (i >= 0) mo = i + 1
        }
        if (mo == null && /^\d{1,2}$/.test(raw)) mo = parseInt(raw, 10)
        if (!Number.isInteger(mo) || mo < 1 || mo > 12) {
          badYear = true
          break
        }
        row[col.field || 'month'] = mo
        continue
      }

      if (col.kind === 'coded') {
        // WONDER 113-list cells carry only a label (in l=), no short code.
        // Use the raw label (with any leading '#') as the stable key; expose
        // a '#'-stripped copy as the display name.
        const raw = (cell.label || cell.value || '').trim()
        if (!raw) {
          badYear = true // no dimension value => not a real data row
          break
        }
        row[col.code] = raw
        row[col.name] = raw.replace(/^#+\s*/, '')
        if (col.level) row[col.level] = cell.hier ?? null
        continue
      }

      if (col.kind === 'measure') {
        const parsed = parseMeasure(cell.value)
        if (parsed.ok) {
          row[col.field] = parsed.value
        } else {
          row[col.field] = null
          if (parsed.flag) {
            row.status = row.status ?? parsed.flag
            if (col.countField && parsed.flag === 'Suppressed') {
              row.suppressed = 1
            }
          }
        }
        continue
      }
    }

    if (badYear) {
      skipped += 1
      continue
    }
    if (row.suppressed) suppressed += 1
    rows.push(row)
  }

  return { rows, stats: { table, mapped: rows.length, skipped, suppressed } }
}

function parseMeasure(raw) {
  const s = String(raw ?? '').trim()
  if (s === '' || s === '.' || s === 'N/A') return { ok: false, flag: null }

  if (NON_NUMERIC_FLAGS.has(s)) return { ok: false, flag: s }

  const n = Number(s.replace(/,/g, ''))
  if (Number.isFinite(n)) return { ok: true, value: n }

  // anything else non-numeric: keep the literal as the flag for visibility
  return { ok: false, flag: s.slice(0, 24) }
}
