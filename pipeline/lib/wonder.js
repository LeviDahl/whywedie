// POSTs a prepared request XML to the CDC WONDER data-request endpoint and
// returns the raw response body (XML string).
//
// Endpoint:  {WONDER_BASE_URL}/{databaseId}
// Body:      application/x-www-form-urlencoded
//              request_xml=<the XML>
//              accept_datause_restrictions=true
//
// WONDER signals problems two ways:
//   - a non-2xx HTTP status (often 400 with an HTML or plain-text reason)
//   - HTTP 200 whose XML body carries <message>...</message> nodes instead
//     of a data table (e.g. "the value ... is not valid", data-use consent
//     missing, or a location grouping the API refuses).
// Both are surfaced verbatim so you can see exactly what WONDER objected to.

import axios from 'axios'
import { wonderBaseUrl, wonderTimeoutMs } from './config.js'

export async function postRequest(databaseId, requestXml) {
  const url = `${wonderBaseUrl}/${databaseId}`
  const body = new URLSearchParams({
    request_xml: requestXml,
    accept_datause_restrictions: 'true',
  })

  let res
  try {
    res = await axios.post(url, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/xml, application/xml',
      },
      timeout: wonderTimeoutMs,
      // we want to inspect non-2xx bodies ourselves
      validateStatus: () => true,
      responseType: 'text',
      transitional: { forcedJSONParsing: false },
      maxContentLength: 200 * 1024 * 1024,
      maxBodyLength: 200 * 1024 * 1024,
    })
  } catch (err) {
    throw new Error(`Could not reach WONDER (${url}): ${err.message}`)
  }

  const text = typeof res.data === 'string' ? res.data : String(res.data ?? '')

  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `WONDER ${databaseId} request failed (HTTP ${res.status}). ` +
        `Response:\n${snippet(text)}`
    )
  }

  const messages = extractMessages(text)
  if (messages.length && !text.includes('<data-table')) {
    throw new Error(
      `WONDER ${databaseId} returned no data table. Messages:\n` +
        messages.map((m) => `  - ${m}`).join('\n')
    )
  }
  if (messages.length) {
    // data table present but WONDER still flagged something worth seeing
    for (const m of messages) console.warn(`  WONDER note: ${m}`)
  }

  return text
}

function extractMessages(xml) {
  const out = []
  const re = /<message>([\s\S]*?)<\/message>/gi
  let m
  while ((m = re.exec(xml))) {
    const t = m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    if (t) out.push(t)
  }
  return out
}

function snippet(text, n = 1200) {
  const t = text.trim()
  return t.length > n ? `${t.slice(0, n)}\n...[truncated ${t.length - n} chars]` : t
}
