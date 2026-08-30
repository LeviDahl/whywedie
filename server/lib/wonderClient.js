// Generic client for the CDC WONDER API.
//
// CDC WONDER has no CORS support and only accepts XML over POST (not
// JSON/REST), so every query goes through here rather than being called
// from the browser directly. See:
// https://wonder.cdc.gov/wonder/help/wonder-api.html
//
// This module only knows how to send a parameter list and parse whatever
// comes back into a plain rows array — it doesn't know what a "death" or a
// "birth" is. Database-specific query builders (e.g. deathStatistics.js)
// live alongside it and use this as their transport.

const { XMLParser } = require('fast-xml-parser')

const REQUEST_TIMEOUT_MS = 60_000

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build the request_xml body from an ordered [name, value][] list.
 * Order matters for some WONDER parameters, so this takes an array of
 * pairs rather than an object.
 */
function buildRequestXml(paramPairs) {
  const body = paramPairs
    .map(([name, value]) => `  <parameter>\n    <name>${escapeXml(name)}</name>\n    <value>${escapeXml(value)}</value>\n  </parameter>`)
    .join('\n')

  return `<request-parameters>\n${body}\n</request-parameters>`
}

/**
 * POST a query to a WONDER database and return the parsed response as
 * plain JS (via fast-xml-parser). Throws with the raw response text
 * attached (err.wonderResponseText) if the response doesn't look like a
 * successful data-table — WONDER's own error messages are descriptive, so
 * surfacing them as-is is the fastest way to debug a bad parameter.
 */
async function queryWonder(databaseId, paramPairs) {
  const requestXml = buildRequestXml(paramPairs)
  const url = `https://wonder.cdc.gov/controller/datarequest/${databaseId}`

  const body = new URLSearchParams({
    request_xml: requestXml,
    accept_datause_restrictions: 'true',
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  const text = await res.text()

  if (!res.ok) {
    const err = new Error(`CDC WONDER returned HTTP ${res.status}`)
    err.wonderResponseText = text
    throw err
  }

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  let parsed
  try {
    parsed = parser.parse(text)
  } catch (parseErr) {
    const err = new Error(`CDC WONDER response was not valid XML: ${parseErr.message}`)
    err.wonderResponseText = text
    throw err
  }

  const rows = parsed?.response?.['data-table']?.r

  if (!rows) {
    const err = new Error('CDC WONDER response had no data-table — likely an invalid parameter. See wonderResponseText for the raw reply.')
    err.wonderResponseText = text
    throw err
  }

  return Array.isArray(rows) ? rows : [rows]
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

module.exports = { queryWonder, toNumber, buildRequestXml }
