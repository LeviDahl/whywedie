// Pipeline: CAUSES OF DEATH (ranked breakdown + trend over time)
//
// Source: the static snapshot the WONDER data pipeline writes to
// /data/mortality.json (see pipeline/). Per-cause rows are CDC WONDER's
// "Underlying Cause of Death" D76 (1999–2020) + "Provisional Mortality" D176
// (2021+), national, grouped by year × the NCHS 113 Selected Causes list,
// with deaths, population, crude rate and age-adjusted rate. Coarser ICD
// *chapter* rows (D74/D16 1968–1998, D76/D176 1999–present) are also
// present — non-'#', so the rankable-cause views below ignore them; the
// "Broad Chapters" section reads them via buildChapters(). Finer ICD
// *sub-chapter* rows (eras `icd9_sub` / `icd8_sub`, when run) let
// buildPrehistory() extend a few rankable causes' trend lines back to
// 1968 as an approximation — see its note.
//
// The snapshot is served same-origin as a plain file — no API call, no
// CORS, no key.
//
// The 113 list contains three kinds of row: roll-up super-categories,
// the ~50 mutually-exclusive "rankable" causes (their label starts with
// '#'), and finer sub-detail. Only the rankable set is meaningful for a
// ranking or a "leading cause" callout, so that's all this module exposes.

const SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/mortality.json`
const META_URL = `${import.meta.env.BASE_URL}data/meta.json`

// Which demographic breakdown axes the pipeline has actually loaded, read
// from the tiny meta.json instead of the ~6 MB mortality_demographic.json —
// so the Breakdown control can render before that file is fetched (it's
// lazy-loaded only when the user picks Sex/Race). Missing/old meta.json →
// assume both are available (they've been deployed since 2026-09).
async function breakdownAxes() {
  try {
    const res = await fetch(META_URL, { headers: { accept: 'application/json' } })
    if (!res.ok) return ['sex', 'race']
    const meta = await res.json()
    const eras = meta?.sources?.mortality ?? []
    const axes = new Set()
    for (const e of eras) {
      const m = /_(sex|race)$/.exec(e.era)
      if (m && (e.rows ?? 0) > 0) axes.add(m[1])
    }
    return axes.size ? [...axes] : ['sex', 'race']
  } catch {
    return ['sex', 'race']
  }
}

// The chapter-grain mortality data (D74 ICD-8 1968–1978, D16 ICD-9
// 1979–1998, D76 ICD-10 1999–2020, D176 ICD-10 2021+) is grouped by ICD
// *chapter*, not the 113-cause list. The revisions label the same chapter
// differently — this maps every label onto one canonical name so a
// chapter's line is continuous across the 1979 and 1999 seams. ICD-10
// splits the old "nervous system & sense organs" chapter into three
// (nervous system / eye / ear), so several labels share a canonical slot
// and `buildChapters` SUMS them. ICD-10 also adds "Codes for special
// purposes" (U00-U99) — that's where COVID-19 (U07.1) lands from 2020 on,
// so it gets its own slot rather than being folded into infectious.
const CHAPTER_CANON = {
  // ICD-8 / ICD-9 (Compressed Mortality)
  'Diseases of the circulatory system': 'Circulatory system',
  Neoplasms: 'Neoplasms (cancers)',
  'Accidents, poisonings, and violence (external cause)': 'External causes (injury, poisoning)',
  'External causes of injury and poisoning': 'External causes (injury, poisoning)',
  'Diseases of the respiratory system': 'Respiratory system',
  'Diseases of the digestive system': 'Digestive system',
  'Endocrine, nutritional, and metabolic diseases': 'Endocrine, nutritional & metabolic',
  'Endocrine, nutritional and metabolic diseases, and immunity disorders':
    'Endocrine, nutritional & metabolic',
  'Certain causes of perinatal mortality': 'Perinatal conditions',
  'Certain conditions originating in the perinatal period': 'Perinatal conditions',
  'Diseases of the genitourinary system': 'Genitourinary system',
  'Symptoms and ill-defined conditions': 'Symptoms & ill-defined conditions',
  'Symptoms, signs, and ill-defined conditions': 'Symptoms & ill-defined conditions',
  'Infective and parasitic diseases': 'Infectious & parasitic diseases',
  'Infectious and parasitic diseases': 'Infectious & parasitic diseases',
  'Congenital anomalies': 'Congenital anomalies',
  'Diseases of the nervous system and sense organs': 'Nervous system & sense organs',
  'Mental disorders': 'Mental disorders',
  'Diseases of the blood and blood-forming organs': 'Blood & blood-forming organs',
  'Diseases of the musculoskeletal system and connective tissue':
    'Musculoskeletal & connective tissue',
  'Diseases of the skin and subcutaneous tissue': 'Skin & subcutaneous tissue',
  'Complications of pregnancy, childbirth, and the puerperium': 'Pregnancy & childbirth',
  // ICD-10 (D76 / D176) — exact label strings confirmed from a WONDER dump
  'Certain infectious and parasitic diseases': 'Infectious & parasitic diseases',
  'Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism':
    'Blood & blood-forming organs',
  'Endocrine, nutritional and metabolic diseases': 'Endocrine, nutritional & metabolic',
  'Mental and behavioural disorders': 'Mental disorders',
  'Diseases of the nervous system': 'Nervous system & sense organs',
  'Diseases of the eye and adnexa': 'Nervous system & sense organs',
  'Diseases of the ear and mastoid process': 'Nervous system & sense organs',
  'Pregnancy, childbirth and the puerperium': 'Pregnancy & childbirth',
  'Congenital malformations, deformations and chromosomal abnormalities': 'Congenital anomalies',
  'Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified':
    'Symptoms & ill-defined conditions',
  'External causes of morbidity and mortality': 'External causes (injury, poisoning)',
  'Codes for special purposes': 'Special-purpose codes (incl. COVID-19)'
}

// Build the by-chapter time series from the non-'#' chapter rows. Returns
// null if the snapshot carries no chapter data.
function buildChapters(raw) {
  const chapterYears = raw.years
    .filter((y) => (raw.byYear[y] ?? []).some((r) => CHAPTER_CANON[r.name]))
    .sort((a, b) => a - b)
  if (!chapterYears.length) return null

  const idx = new Map(chapterYears.map((y, i) => [Number(y), i]))
  const byChapter = {}
  // Add (not overwrite): ICD-10 splits one canonical slot ("Nervous system
  // & sense organs") across three source chapters, so >1 row can land on
  // the same slot in a year. Crude rates share the year's population base
  // so they add exactly; age-adjusted rates add near-exactly (same
  // standard weights) and the split-off pieces (eye, ear) are ~0.02.
  const add = (arr, i, v) => {
    if (v != null) arr[i] = (arr[i] ?? 0) + v
  }
  for (const y of chapterYears) {
    for (const r of raw.byYear[y] ?? []) {
      const canon = CHAPTER_CANON[r.name]
      if (!canon) continue
      const s =
        byChapter[canon] ??
        (byChapter[canon] = {
          deaths: chapterYears.map(() => null),
          crudeRate: chapterYears.map(() => null),
          ageAdjustedRate: chapterYears.map(() => null)
        })
      const i = idx.get(Number(y))
      add(s.deaths, i, r.deaths)
      add(s.crudeRate, i, r.crudeRate)
      add(s.ageAdjustedRate, i, r.ageAdjustedRate)
    }
  }

  // Order chapters by their most recent death count, biggest first.
  const names = Object.keys(byChapter).sort(
    (a, b) => (lastNonNull(byChapter[b].deaths) ?? 0) - (lastNonNull(byChapter[a].deaths) ?? 0)
  )
  const years = chapterYears.map(Number)
  // Classification seams that actually fall inside the data: ICD-8→9 (1979)
  // and ICD-9→10 (1999).
  const seams = [1979, 1999].filter((s) => s > years[0] && s <= years[years.length - 1])
  return { years, names, byChapter, seams }
}

function lastNonNull(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]
  return null
}

// ---------------------------------------------------------------------------
// Pre-1999 extension for a HANDFUL of rankable causes.
//
// The 113-cause list only exists 1999+. WONDER's Compressed Mortality DBs
// (D16 1979–1998, D74 1968–1978) don't carry it either — the finest cause
// grain they offer is the ICD *sub-chapter* (~130 code-range groups, eras
// `icd9_sub` / `icd8_sub`). This maps the sub-chapters that line up with an
// ICD-10 113-list cause — as a single group or a clean sum — so those
// causes' trend lines can run back to 1968.
//
// It is NOT a comparability-ratio crosswalk. Counts are raw, so a line's
// LEVEL can step at the 1979 / 1999 seam even when the real trend is
// smooth. `buildPrehistory` marks these years so the view greys them and
// labels them approximate. Causes not listed here stay 1999+.
//
// Label strings are the exact `cause_name` values from D16 / D74 dumps.
const PREHISTORY_MAP = {
  // I00-I09,I11,I13,I20-I51 ~= rheumatic + ischemic + other heart. Omits
  // hypertensive heart (ICD-9/8 bundle it with hypertensive *renal* in one
  // sub-chapter, not separable), so this runs slightly LOW pre-1999.
  'Diseases of heart (I00-I09,I11,I13,I20-I51)': {
    icd9: ['Chronic rheumatic heart disease', 'Ischemic heart disease', 'Other forms of heart disease'],
    icd8: ['Chronic rheumatic heart disease', 'Ischemic heart disease', 'Other forms of heart disease']
  },
  'Malignant neoplasms (C00-C97)': {
    icd9: [
      'Malignant neoplasm of lip, oral cavity, and pharynx',
      'Malignant neoplasm of digestive organs and peritoneum',
      'Malignant neoplasm of respiratory and intrathoracic organs',
      'Malignant neoplasm of bone, connective tissue, skin, and breast',
      'Malignant neoplasm of genitourinary organs',
      'Malignant neoplasm of other and unspecified sites',
      'Malignant neoplasm of lymphatic and hematopoietic tissue'
    ],
    icd8: [
      'Malignant neoplasm of buccal cavity and pharynx',
      'Malignant neoplasm of digestive organs and peritoneum',
      'Malignant neoplasm of respiratory system',
      'Malignant neoplasm of bone, connective tissue, skin, and breast',
      'Malignant neoplasm of genitourinary organs',
      'Malignant neoplasm of other and unspecified sites',
      'Neoplasms of lymphatic and hematopoietic tissue'
    ]
  },
  'Cerebrovascular diseases (I60-I69)': {
    icd9: ['Cerebrovascular disease'],
    icd8: ['Cerebrovascular disease']
  },
  'Chronic lower respiratory diseases (J40-J47)': {
    icd9: ['Chronic obstructive pulmonary disease and allied conditions'],
    icd8: ['Bronchitis, emphysema, and asthma']
  },
  'Influenza and pneumonia (J09-J18)': {
    icd9: ['Pneumonia and influenza'],
    icd8: ['Influenza', 'Pneumonia']
  },
  'Accidents (unintentional injuries) (V01-X59,Y85-Y86)': {
    icd9: [
      'Railway accidents',
      'Motor vehicle traffic accidents',
      'Motor vehicle nontraffic accidents',
      'Other road vehicle accidents',
      'Water transport accidents',
      'Air and space transport accidents',
      'Vehicle accidents, not elsewhere classifiable',
      'Accidental poisoning by drugs, medicinal substances, and biologicals',
      'Accidental poisoning by other solid and liquid substances, gases, and vapors',
      'Accidental falls',
      'Accidents caused by fire and flames',
      'Accidents due to natural and environmental factors',
      'Accidents caused by submersion, suffocation, and foreign bodies',
      'Other accidents',
      'Late effects of accidental injury'
    ],
    icd8: [
      'Railway accidents',
      'Motor vehicle traffic accidents',
      'Motor vehicle nontraffic accidents',
      'Other road vehicle accidents',
      'Water transport accidents',
      'Air and space transport accidents',
      'Accidental poisoning by drugs and medicaments',
      'Accidental poisoning by other solid and liquid substances',
      'Accidental poisoning by gases and vapors',
      'Accidental falls',
      'Accidents caused by fires and flames',
      'Accidents due to natural and environmental factors',
      'Other accidents',
      'Late effects of accidental injury'
    ]
  },
  'Intentional self-harm (suicide) (*U03,X60-X84,Y87.0)': {
    icd9: ['Suicide and self-inflicted injury'],
    icd8: ['Suicide and self-inflicted injury']
  },
  'Assault (homicide) (*U01-*U02,X85-Y09,Y87.1)': {
    icd9: ['Homicide and injury purposely inflicted by other persons'],
    icd8: ['Homicide and injury purposely inflicted by other persons']
  },
  'Nephritis, nephrotic syndrome and nephrosis (N00-N07,N17-N19,N25-N27)': {
    icd9: ['Nephritis, nephrotic syndrome, and nephrosis'],
    icd8: ['Nephritis and nephrosis']
  },
  'Tuberculosis (A16-A19)': {
    icd9: ['Tuberculosis'],
    icd8: ['Tuberculosis']
  },
  'Nutritional deficiencies (E40-E64)': {
    icd9: ['Nutritional deficiencies'],
    icd8: ['Avitaminoses and other nutritional deficiency']
  }
}

// Sum the mapped sub-chapters per pre-1999 year for each cause in
// PREHISTORY_MAP. Crude rate is recomputed from summed deaths ÷ the year's
// population (exact); the age-adjusted rate is summed (approximate — the
// sub-chapters share the 2000 standard weights). Returns null if the
// snapshot carries no sub-chapter rows yet (eras `icd9_sub` / `icd8_sub`
// not run).
function buildPrehistory(raw) {
  const isSub = (r) => (r.icdVersion === 8 || r.icdVersion === 9) && !String(r.code ?? '').startsWith('#')
  const preYears = raw.years
    .map(Number)
    .filter((y) => y < 1999 && (raw.byYear[y] ?? []).some(isSub))
    .sort((a, b) => a - b)
  if (!preYears.length) return null

  const byCause = {}
  for (const [name, m] of Object.entries(PREHISTORY_MAP)) {
    const deaths = []
    const crudeRate = []
    const ageAdjustedRate = []
    let anyData = false
    for (const y of preYears) {
      const rows = raw.byYear[y] ?? []
      const want = new Set(y >= 1979 ? m.icd9 : m.icd8)
      let d = null
      let aar = null
      let pop = null
      for (const r of rows) {
        if (pop == null && (r.icdVersion === 8 || r.icdVersion === 9) && r.population != null) {
          pop = r.population
        }
        if (!want.has(r.name)) continue
        if (r.deaths != null) {
          d = (d ?? 0) + r.deaths
          anyData = true
        }
        if (r.ageAdjustedRate != null) aar = (aar ?? 0) + r.ageAdjustedRate
      }
      deaths.push(d)
      crudeRate.push(d != null && pop ? Math.round((d / pop) * 100000 * 10) / 10 : null)
      ageAdjustedRate.push(aar == null ? null : Math.round(aar * 10) / 10)
    }
    if (anyData) byCause[name] = { deaths, crudeRate, ageAdjustedRate }
  }
  if (!Object.keys(byCause).length) return null

  const seams = [1979, 1999].filter((s) => s > preYears[0] && s <= 1999)
  return { years: preYears, byCause, seams }
}

export async function fetchCausesOfDeath() {
  let res
  let axes
  try {
    ;[res, axes] = await Promise.all([
      fetch(SNAPSHOT_URL, { headers: { accept: 'application/json' } }),
      breakdownAxes()
    ])
  } catch (err) {
    throw new Error(`Couldn't load the mortality data file: ${err.message}`)
  }
  if (!res.ok) {
    throw new Error(
      `Couldn't load the mortality data file (HTTP ${res.status}). ` +
        `It's generated by the data pipeline — see pipeline/README.md.`
    )
  }

  const raw = await res.json()
  const leading = raw.causes.filter((c) => c.leading)
  const leadingCodes = new Set(leading.map((c) => c.code))

  // Ranked rows per year (rankable causes only). Kept sorted by deaths
  // descending here; the view re-sorts by whichever metric is selected.
  const byYear = {}
  for (const [year, rows] of Object.entries(raw.byYear)) {
    byYear[year] = rows
      .filter((r) => leadingCodes.has(r.code))
      .map((r) => ({
        code: r.code,
        cause: r.name,
        deaths: r.deaths,
        crudeRate: r.crudeRate,
        ageAdjustedRate: r.ageAdjustedRate,
        suppressed: r.suppressed
      }))
  }

  // The snapshot can carry years that only have an all-cause provisional
  // total (D176, 2021+) and no per-cause breakdown. The ranked/trend UI is
  // cause-level, so restrict `years` (and coverage) to years that actually
  // have rankable-cause rows — otherwise the year picker offers 2021-24
  // and the default period lands on an empty chart.
  const years = raw.years.filter((y) => byYear[y]?.length)
  const yearMax = years.at(-1) ?? raw.coverage?.yearMax

  // Per-cause time series, keyed by display name and ALIGNED to the full
  // `years` axis (missing years -> null) so the view can overlay several
  // causes on one chart without re-indexing. A cause that only appears
  // partway through the range (e.g. COVID-19) simply has leading nulls.
  const allYears = years
  const byCause = {}
  for (const c of leading) {
    const s = raw.byCause[`${c.icdVersion}:${c.code}`]
    if (!s) continue
    const at = (arr) => {
      const m = new Map(s.years.map((y, i) => [y, arr[i]]))
      return allYears.map((y) => (m.has(y) ? m.get(y) : null))
    }
    byCause[c.name] = {
      code: c.code,
      years: allYears,
      deaths: at(s.deaths),
      crudeRate: at(s.crudeRate),
      ageAdjustedRate: at(s.ageAdjustedRate)
    }
  }

  const causes = leading.map((c) => c.name).sort((a, b) => a.localeCompare(b))

  return {
    source: raw.source,
    fetchedAt: raw.fetchedAt,
    coverage: { ...raw.coverage, yearMax },
    years,
    causes,
    byYear,
    byCause,
    chapters: buildChapters(raw),
    prehistory: buildPrehistory(raw),
    // Breakdown axes present in the pipeline — lets the view show the
    // Sex/Race control before the heavy demographic file is fetched.
    breakdown: { available: axes.length > 0, dimensions: axes }
  }
}
