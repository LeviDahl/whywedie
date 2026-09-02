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
    // D76 grouped by Year only — one all-cause total per year, with crude
    // and age-adjusted rate. Feeds the Death Statistics annual chart
    // (1999-2020), continuous with the D176 `provisional` all-cause rows
    // (2021+). Same synthetic non-'#' "All causes" cause tag as
    // `provisional`, so the Causes-of-Death ranked view ignores it.
    icd10_total: {
      databaseId: 'D76',
      templateFile: 'mortality_icd10_total.xml',
      table: 'mortality',
      fixed: {
        icd_version: 10,
        cause_code: 'All causes',
        cause_name: 'All causes',
        cause_level: 0,
      },
      yearMin: 1999,
      yearMax: 2020,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
    // D176 grouped by Year x Month — one all-cause row per month, back to
    // Jan 2018. Feeds the Death Statistics monthly chart (the Socrata table
    // hmz2-vwda was trimmed to a rolling ~18-month window). Own table
    // `mortality_monthly`.
    monthly: {
      databaseId: 'D176',
      templateFile: 'mortality_monthly.xml',
      table: 'mortality_monthly',
      fixed: {},
      yearMin: 2018,
      yearMax: 2027,
      columns: [
        { kind: 'year' },
        { kind: 'month', field: 'month' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
      ],
    },
    // D16 = "Compressed Mortality, 1979-1998" (ICD-9 era). COARSE cause
    // detail: Year x ICD Chapter (D16.V2-level1, ~17 chapters) — that grain
    // lines up with the ICD-10 chapter roll-ups without a comparability
    // crosswalk. A 113-list-equivalent ICD-9 breakdown is a separate future
    // effort. Same 6-col contract + `mortality` table as `icd10`, so
    // build-snapshots treats these as ordinary (non-'#', so non-rankable)
    // mortality rows.
    icd9: {
      databaseId: 'D16',
      templateFile: 'mortality_icd9_chapter.xml',
      table: 'mortality',
      fixed: { icd_version: 9 },
      yearMin: 1979,
      yearMax: 1998,
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' }, // D16.V2-level1 "ICD Chapter"
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
    // Causes-of-Death "Breakdown" data: D76 grouped by Year x 113-Cause-List
    // x an extra demographic axis. Written to the SEPARATE
    // `mortality_demographic` table (7-col contract: year, cause, subgroup,
    // 4 measures) so the main mortality path is untouched. One era per axis
    // because WONDER suppresses fewer cells per query and the UI shows one
    // breakdown at a time. B_3 = D76.V7 (Gender) / D76.V8 (Race) — the
    // standard D76 demographic variables.
    icd10_sex: {
      databaseId: 'D76',
      templateFile: 'mortality_icd10_sex.xml',
      table: 'mortality_demographic',
      fixed: { icd_version: 10, dimension: 'sex' },
      yearMin: 1999,
      yearMax: 2020,
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' },
        { kind: 'coded', code: 'subgroup', name: 'subgroup' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
    icd10_race: {
      databaseId: 'D76',
      templateFile: 'mortality_icd10_race.xml',
      table: 'mortality_demographic',
      fixed: { icd_version: 10, dimension: 'race' },
      yearMin: 1999,
      yearMax: 2020,
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' },
        { kind: 'coded', code: 'subgroup', name: 'subgroup' },
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
      // Run `--years=2021-<last COMPLETE year>`. D176 is "through Last
      // Month", so the current calendar year is partial — including it
      // plots a fake cliff. yearMax is generous so a wider --years isn't
      // clipped; keep the run range at the last full year.
      yearMin: 2021,
      yearMax: 2030,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
      ],
    },
    // Per-cause version of the above: D176 grouped by Year x UCD ICD-10 113
    // Cause List (V4), with O_ucd=D176.V4 and age-adjusted rate enabled.
    // Same 6-col contract + `mortality` table as `icd10`, so causesOfDeath.js
    // picks up 2021+ per-cause automatically. Runs alongside `provisional`
    // (year-only all-cause) — different cause_code, no key collision.
    provisional_causes: {
      databaseId: 'D176',
      templateFile: 'mortality_provisional_causes.xml',
      table: 'mortality',
      fixed: { icd_version: 10 },
      yearMin: 2021,
      yearMax: 2030,
      columns: [
        { kind: 'year' },
        { kind: 'coded', code: 'cause_code', name: 'cause_name', level: 'cause_level' },
        { kind: 'measure', field: 'death_count', countField: true },
        { kind: 'measure', field: 'population' },
        { kind: 'measure', field: 'crude_rate' },
        { kind: 'measure', field: 'age_adjusted_rate' },
      ],
    },
    // D74 = "Compressed Mortality, 1968-1978" (ICD-8 era). NOT D15 — on
    // today's WONDER, id D15 is the Tuberculosis (OTIS) system. Coarse
    // (chapter) cause detail, like `icd9`: Year x ICD Chapter
    // (D74.V2-level1) — no ICD-8 -> ICD-10 crosswalk at chapter grain.
    // Column shape identical to `icd9` / `icd10`.
    icd8: {
      databaseId: 'D74',
      templateFile: 'mortality_icd8_chapter.xml',
      table: 'mortality',
      fixed: { icd_version: 8 },
      yearMin: 1968,
      yearMax: 1978,
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
    // monthly. Template rebuilt from the real D192 request form. D192's
    // measure list is Births + "Average X" only — there is NO fertility /
    // birth rate measure in provisional natality — so this era is
    // [year, birth_count]; the rate for 2023+ is unavailable from WONDER
    // until CDC finalizes those years into the Natality series. Its newest
    // year is partial/provisional; the frontend flags it. Until this is
    // confirmed against live WONDER, src/api/natality.js rolls up Socrata
    // monthly births for the latest complete year as a stopgap.
    current: {
      databaseId: 'D192',
      templateFile: 'natality_current.xml',
      table: 'natality',
      fixed: {},
      yearMin: 2023,
      yearMax: 2030,
      columns: [
        { kind: 'year' },
        { kind: 'measure', field: 'birth_count', countField: true },
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
  mortality_demographic: [
    'year',
    'state_code',
    'icd_version',
    'cause_code',
    'cause_name',
    'cause_level',
    'dimension',
    'subgroup',
    'death_count',
    'population',
    'crude_rate',
    'age_adjusted_rate',
    'suppressed',
    'status',
  ],
  mortality_monthly: [
    'year',
    'month',
    'state_code',
    'death_count',
    'population',
    'crude_rate',
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
  mortality_demographic: [
    'cause_name',
    'cause_level',
    'death_count',
    'population',
    'crude_rate',
    'age_adjusted_rate',
    'suppressed',
    'status',
  ],
  mortality_monthly: ['death_count', 'population', 'crude_rate', 'suppressed', 'status'],
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
