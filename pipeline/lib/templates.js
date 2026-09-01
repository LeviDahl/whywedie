// Loads a hand-exported WONDER request template from ./templates/ and
// prepares it for POSTing.
//
// The templates are produced manually (see templates/README.md). This module
// does the minimum mechanical work on them:
//
//   1. {{YEAR_LIST}}  ->  <value>1999</value><value>2000</value>...
//        Lets one era be sliced into smaller year ranges to stay under
//        WONDER's per-request size/time limits. If the token isn't in the
//        template, a --years argument is ignored (with a warning) and the
//        template's own year filter is used as-is.
//
//   2. Guarantees an  accept_datause_restrictions = true  parameter is
//        present in the XML (WONDER also wants it as a form field; wonder.js
//        adds that). Missing consent is the single most common reason a
//        hand-built template 400s.
//
// Nothing else is rewritten — the template is otherwise sent verbatim.

import { readFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'
import { templateDir } from './config.js'

const YEAR_TOKEN = '{{YEAR_LIST}}'

export async function loadTemplate(templateFile, { years } = {}) {
  const path = isAbsolute(templateFile)
    ? templateFile
    : join(templateDir, templateFile)

  let xml
  try {
    xml = await readFile(path, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Template not found: ${path}\n` +
          `Export it from WONDER following pipeline/templates/README.md and ` +
          `save it there.`
      )
    }
    throw err
  }

  if (!xml.includes('<request-parameters')) {
    throw new Error(
      `${path} does not look like a WONDER request document ` +
        `(no <request-parameters> element).`
    )
  }

  const yearTokenPresent = xml.includes(YEAR_TOKEN)
  const yearsApplied = Boolean(years) && yearTokenPresent
  xml = applyYearList(xml, years, path, yearTokenPresent)

  const consentInjected = !/<name>\s*accept_datause_restrictions\s*<\/name>/i.test(xml)
  xml = ensureDataUseConsent(xml)

  return {
    xml,
    path,
    meta: { yearTokenPresent, yearsApplied, consentInjected },
  }
}

function applyYearList(xml, years, path, hasToken) {
  if (!years) {
    if (hasToken) {
      throw new Error(
        `${path} contains ${YEAR_TOKEN} but no --years range was given. ` +
          `Pass e.g. --years=1999-2010, or remove the token and hard-code ` +
          `the years in the template.`
      )
    }
    return xml
  }

  if (!hasToken) {
    // caller wants slicing but the template can't express it
    return xml // fetch.js logs the warning; nothing to substitute
  }

  const values = expandYears(years)
    .map((y) => `<value>${y}</value>`)
    .join('')
  return xml.split(YEAR_TOKEN).join(values)
}

/** "1999-2010" -> [1999..2010]; "2020" -> [2020]; "2019,2021" -> [2019,2021] */
export function expandYears(spec) {
  const out = new Set()
  for (const part of String(spec).split(',')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/)
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])]
      const [lo, hi] = a <= b ? [a, b] : [b, a]
      for (let y = lo; y <= hi; y++) out.add(y)
    } else if (/^\d{4}$/.test(trimmed)) {
      out.add(Number(trimmed))
    } else {
      throw new Error(`Bad --years segment "${trimmed}" (want YYYY or YYYY-YYYY)`)
    }
  }
  if (out.size === 0) throw new Error(`--years produced no years from "${spec}"`)
  return [...out].sort((a, b) => a - b)
}

function ensureDataUseConsent(xml) {
  if (/<name>\s*accept_datause_restrictions\s*<\/name>/i.test(xml)) return xml
  const param =
    '<parameter><name>accept_datause_restrictions</name><value>true</value></parameter>'
  // insert just before the closing tag of the parameter list
  return xml.replace(/<\/request-parameters>/i, `${param}</request-parameters>`)
}
