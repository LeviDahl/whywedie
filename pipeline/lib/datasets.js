// Registry of every WONDER dataset this pipeline pulls, keyed by
// `--type` then `--era`.
//
// `columns` is the CONTRACT with the hand-exported XML template in
// ./templates/. It lists, in order, what each <c> cell of a response row
// means. It MUST match the order of "Group By" variables followed by
// "Measures" in the template. templates/README.md spells out exactly how to
// build each template so this lines up. If WONDER changes a row's cell
// count, mapRows.js throws instead of writing garbage.
//
// column.kind:
//   'year'    -> integer, used as the `year` DB field
//   'coded'   -> a grouped dimension; cell `v` = code, cell `l` = label.
//               `code`/`name` say which DB fields they populate.
//   'measure' -> a numeric measure; `field` says the DB field. Non-numeric
//               WONDER flags ("Suppressed", "Unreliable", "Not Applicable",
//               "Missing") become NULL + status, and "Suppressed" also sets
//               the row's `suppressed` flag when it lands on the count field.
//
// Year coverage per database is what CDC documents for each ID; the pipeline
// also trusts whatever years actually come back.

export const DATASETS = {
  mortality: {
    icd10: {
      // D76 = "Underlying Cause of Death, 1999-2020" (finalized). NOT D176,
      // which is the newer 2018+ single-race series. Group-by var D76.V1
      // (Year) x D76.V4 (ICD-10 113 Cause List); measures D76.M1..M4.
      // Years 2021+ would need a separate DB added as another era.
      databaseId: 'D76',
      templateFile: 'mortality_icd10.xml',
      table: 'mortality',
      fixed: { icd_version: 10 },
      yearMin: 1999,
      yearMax: 2020,
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' }, // D76.V4 "ICD-10 113 Cause List"
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
    icd9: {
      databaseId: 'D16',
      templateFile: 'mortality_icd9.xml',
      table: 'mortality',
      fixed: { icd_version: 9 },
      yearMin: 1979,
      yearMax: 1998,
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' }, // "ICD-9 113 Cause List"
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
    // Recent years (2021+). D176 = "Provisional Mortality Statistics, 2018
    // through Last Month", updated monthly. Group By = Year ONLY — D176's
    // "15 Leading Causes" list (V4) refuses to combine with any other
    // group-by, and its 113-cause-list variable isn't confirmed, so this
    // era stores national ALL-CAUSE yearly totals (deaths / population /
    // crude rate), not a per-cause breakdown. It exists to carry the
    // Causes-of-Death / Death-Statistics pages past D76's 2020 edge with an
    // honest provisional total. `fixed` tags every row as the synthetic
    // "All causes" cause so it slots into the mortality table without a
    // NULL in the unique key; it is NOT '#'-prefixed, so the ranked view
    // (which filters to '#' rankable causes) ignores it. yearMax is a
    // rolling edge; the newest year is partial (flag it in the UI).
    provisional: {
      databaseId: 'D176',
      templateFile: 'mortality_provisional.xml',
      table: 'mortality',
      fixed: {
        icd_version: 10,
        cause_code: 'All causes',
        cause_name: 'All causes',
        cause_level: 0,
        age_adjusted_rate: null,
      },
      yearMin: 2021,
      yearMax: 2025,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
      ],
    },
    icd8: {
      databaseId: 'D15',
      templateFile: 'mortality_icd8.xml',
      table: 'mortality',
      fixed: { icd_version: 8 },
      yearMin: 1968,
      yearMax: 1978,
      // D15 has no NCHS 113-cause list. templates/README.md says to group by
      // the coarsest cause recode / chapter it offers; the column shape is
      // otherwise identical.
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
  },

  natality: {
    // Non-overlapping eras (natality's UNIQUE key is just year+state).
    // fetch.js clips each era's rows to [yearMin, yearMax] — the WONDER
    // databases return more years than their name implies (D66 now reaches
    // 2024, D27 is actually "Natality, 2003-2006"), so the clip is what
    // keeps eras from colliding. build-snapshots.js concatenates them and
    // merges pre-2003 years from the committed natality.json baseline.
    //
    // Every era: Group By = Year (<db>.V20); Measures = <db>.M1 (Births) +
    // <db>.M5 (which yields Female Population 15-44 and General Fertility
    // Rate). Response columns: year, births, population, fertility_rate.
    //
    // D192 = "Provisional Natality, 2023 through Last Month" — updated
    // monthly. Its newest year is PARTIAL/provisional; the frontend flags it.
    current: {
      databaseId: 'D192',
      templateFile: 'natality_current.xml',
      table: 'natality',
      fixed: {},
      yearMin: 2023,
      yearMax: 2027,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'fertility_rate' },
      ],
    },
    // D66 = "Natality, 2007-2022" (returns through 2024 — clipped to 2022).
    mid: {
      databaseId: 'D66',
      templateFile: 'natality_mid.xml',
      table: 'natality',
      fixed: {},
      yearMin: 2007,
      yearMax: 2022,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'fertility_rate' },
      ],
    },
    // D27 = "Natality, 2003-2006" (fills the old Socrata gap).
    gap: {
      databaseId: 'D27',
      templateFile: 'natality_gap.xml',
      table: 'natality',
      fixed: {},
      yearMin: 2003,
      yearMax: 2006,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'fertility_rate' },
      ],
    },
  },
}

/** All DB fields this pipeline ever writes, per table — drives the upsert. */
export const TABLE_COLUMNS = {
  mortality: [
    'year',
    'state_code',
    'icd_version',
    'cause_code',
    'cause_name',
    'cause_level',
    'death_count',
    'population',
    'crude_rate',
    'age_adjusted_rate',
    'suppressed',
    'status',
  ],
  natality: [
    'year',
    'state_code',
    'birth_count',
    'population',
    'birth_rate',
    'fertility_rate',
    'suppressed',
    'status',
  ],
}

/** Columns updated on duplicate-key (everything except the key + id). */
export const UPSERT_UPDATE_COLUMNS = {
  mortality: [
    'cause_name',
    'cause_level',
    'death_count',
    'population',
    'crude_rate',
    'age_adjusted_rate',
    'suppressed',
    'status',
  ],
  natality: ['birth_count', 'population', 'birth_rate', 'fertility_rate', 'suppressed', 'status'],
}

/** Look up one dataset, or throw a helpful list of what's valid. */
export function resolveDataset(type, era) {
  const group = DATASETS[type]
  if (!group) {
    throw new Error(
      `Unknown --type "${type}". Expected one of: ${Object.keys(DATASETS).join(', ')}`
    )
  }
  const ds = group[era]
  if (!ds) {
    throw new Error(
      `Unknown --era "${era}" for --type ${type}. Expected one of: ${Object.keys(group).join(', ')}`
    )
  }
  return { type, era, ...ds }
}
