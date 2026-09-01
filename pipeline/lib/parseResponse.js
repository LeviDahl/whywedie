// Turns a raw WONDER response XML string into a rectangular grid of cells.
//
// The hard part is WONDER's data-table format: when you group by more than
// one variable, a cell that would repeat down a column is emitted ONCE with
// a rowspan (`r="N"`) attribute and simply omitted from the next N-1 rows.
// So row 2 of a year x cause table has one fewer <c> than row 1. This
// module carries spanned values forward so every logical row comes out with
// the full, fixed number of columns.
//
// Element names vary a little between WONDER databases / vintages, so the
// data-table / row / cell lookups are tolerant.

import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === 'r' || name === 'c' || name === 'row' || name === 'cell',
})

const ROW_TAGS = ['r', 'row']
const CELL_TAGS = ['c', 'cell']

/**
 * @param {string} xml   raw WONDER response
 * @param {number} expectedCols  number of logical columns (from the dataset's `columns`)
 * @returns {{ grid: Array<Array<{value:string,label:string}>>, rawRowCount:number }}
 */
export function parseTable(xml, expectedCols) {
  const doc = parser.parse(xml)

  const dataTable = findNode(doc, (k) => k === 'data-table' || k === 'data_table' || k === 'dataTable')
  if (!dataTable) {
    throw new Error(
      'No <data-table> found in WONDER response. First 500 chars:\n' +
        xml.trim().slice(0, 500)
    )
  }

  const rows = firstArray(dataTable, ROW_TAGS)
  if (!rows || rows.length === 0) {
    throw new Error('WONDER <data-table> contained no rows.')
  }

  const grid = []
  /** @type {Array<{cell:object, remaining:number}|null>} */
  const carry = new Array(expectedCols).fill(null)

  for (const row of rows) {
    const cells = firstArray(row, CELL_TAGS) || []
    const logical = new Array(expectedCols)
    let colIdx = 0
    let cursor = 0

    while (colIdx < expectedCols) {
      const held = carry[colIdx]
      if (held && held.remaining > 0) {
        logical[colIdx] = toCell(held.cell)
        held.remaining -= 1
        colIdx += 1
        continue
      }
      const cell = cells[cursor++]
      if (cell === undefined) break // row genuinely shorter than expected
      logical[colIdx] = toCell(cell)
      const span = Number(cell['@_r'] || cell['@_rowspan'] || 1)
      if (span > 1) carry[colIdx] = { cell, remaining: span - 1 }
      colIdx += 1
    }

    // a row that couldn't be filled to width is a totals/label artifact —
    // mapRows.js drops it, but keep the partial so counts line up.
    grid.push(logical)
  }

  return { grid, rawRowCount: rows.length }
}

function toCell(c) {
  if (c == null) return { value: '', label: '', hier: null }
  if (typeof c === 'string') return { value: c, label: c, hier: null }
  const value = c['@_v'] ?? c['@_value'] ?? c['#text'] ?? ''
  const label = c['@_l'] ?? c['@_label'] ?? value
  const hRaw = c['@_h'] ?? c['@_hier']
  const hier = hRaw === undefined ? null : Number(hRaw)
  return {
    value: String(value).trim(),
    label: String(label).trim(),
    hier: Number.isFinite(hier) ? hier : null,
  }
}

/** depth-first search for the first object key matching `pred`. */
function findNode(obj, pred) {
  if (obj == null || typeof obj !== 'object') return null
  for (const [k, v] of Object.entries(obj)) {
    if (pred(k)) return v
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const hit = findNode(v, pred)
      if (hit) return hit
    }
  }
  return null
}

/** given a parent node, return the first present child array among `tags`. */
function firstArray(node, tags) {
  if (!node || typeof node !== 'object') return null
  for (const t of tags) {
    if (Array.isArray(node[t])) return node[t]
  }
  return null
}
