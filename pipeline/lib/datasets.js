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
    modern: {
      databaseId: 'D149',
      templateFile: 'natality_modern.xml',
      table: 'natality',
      fixed: {},
      yearMin: 2016,
      yearMax: 2024,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'birth_rate' },
      ],
    },
    mid: {
      databaseId: 'D66',
      templateFile: 'natality_mid.xml',
      table: 'natality',
      fixed: {},
      yearMin: 2007,
      yearMax: 2015,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'birth_rate' },
      ],
    },
    old: {
      databaseId: 'D27',
      templateFile: 'natality_old.xml',
      table: 'natality',
      fixed: {},
      yearMin: 1995,
      yearMax: 2002,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'birth_rate' },
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
  natality: ['birth_count', 'population', 'birth_rate', 'suppressed', 'status'],
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
