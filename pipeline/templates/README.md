# WONDER request templates

`fetch.js` does **not** build WONDER queries from scratch. It reads a request
XML document from this folder, does two tiny edits (`{{YEAR_LIST}}`
substitution, data-use consent), strips XML comments, and POSTs it to
`https://wonder.cdc.gov/controller/datarequest/<DB>`.

```
mortality_icd10.xml            -> D76    Underlying Cause of Death, 1999-2020        (Year x 113 list)
mortality_icd10_total.xml      -> D76    ... Year only = all-cause totals
mortality_icd10_sex.xml        -> D76    ... x Gender (V7)  -> mortality_demographic
mortality_icd10_race.xml       -> D76    ... x Race (V8)    -> mortality_demographic
mortality_provisional.xml      -> D176   Provisional Mortality 2018->now, Year only = all-cause
mortality_provisional_causes.xml -> D176 ... Year x 113 list (B_2=D176.V4 WITH O_ucd=D176.V4)
mortality_provisional_sex.xml    -> D176   ... x Sex (V7)   -> mortality_demographic, 2021+
mortality_provisional_race.xml   -> D176   ... x Race (V42)  -> mortality_demographic, 2021+
mortality_monthly.xml          -> D176   ... Year x Month = monthly all-cause
mortality_icd9_chapter.xml     -> D16    Compressed Mortality, 1979-1998  (Year x ICD Chapter)
mortality_icd8_chapter.xml     -> D74    Compressed Mortality, 1968-1978  (Year x ICD Chapter)
mortality_icd10_chapter.xml    -> D76    Underlying Cause of Death 1999-2020  (Year x ICD-10 Chapter; B_2=D76.V2-level1, O_ucd=D76.V2)
mortality_provisional_chapter.xml -> D176 Provisional Mortality 2021+       (Year x ICD-10 Chapter; B_2=D176.V2-level1, O_ucd=D176.V2)
natality_mid.xml               -> D66    Natality, 2007-2022        (Year: births + fertility rate)
natality_gap.xml               -> D27    Natality, 2003-2006        (Year: births + fertility rate)
natality_current.xml           -> D192   Provisional Natality, 2023->now  (Year: births ONLY)
natality_monthly.xml           -> D192   ... Year x Month = monthly births  -> natality_monthly
```

All of the above have been run against live WONDER and return
correctly-shaped data, except `mortality_provisional_sex.xml` /
`_race.xml`, which are built but still need one confirming `--dump` each.
Commit them — they contain no secrets and make the pipeline reproducible.

---

## How these were built: adapt the web UI's request body

WONDER's interactive site POSTs its request form as `stage=request` with the
**same parameter names the API wants** (`B_1`, `B_2`, `M_1`, `O_aar`,
`O_location`, `V_<db>.V*`, `F_<db>.V*`, `finder-stage-*`, …). So the fastest
way to get a known-good parameter set for a new database is:

1. Fill in that database's request form on wonder.cdc.gov the way you want
   the query (e.g. Group Results By = Year, And By = ICD Chapter, check
   Age-Adjusted Rate).
2. DevTools → Network → the request to `/controller/datarequest/<DB>` →
   **Payload → view source**, and copy the form body.
3. Turn each `name=value` pair into a `<parameter><name>…</name>
   <value>…</value></parameter>` block. Drop the browser-only cruft
   (`O_export-format`, the `action-Send-Export Results` toggle). Keep
   `stage=request`, `action-Send=Send`.
4. Replace the year selection with the literal token `{{YEAR_LIST}}` as the
   `V_<db>.V1` (mortality) value so `fetch.js --years=` can slice it;
   natality templates take no year filter (see below).

Gotchas found doing this:

- **`O_PR`** — D176 and D192 (the "provisional / expanded / single-race"
  databases) hard-require `O_PR=false`; omitting it returns
  *"Missing parameter O_PR, needed for stored procedure."* D76 / D66 / D27 /
  D16 / D74 don't use it.
- **`O_aar=aar_std`** — the "Age Adjusted Rate" checkbox (`O_aar_enable=true`)
  is not enough on its own; its companion radio `O_aar=aar_std` must also be
  sent or the request fails with a bare "Processing Error" (no `<message>`).
- **Empty vs `*All*`** — D192 rejects an empty location code
  (*"Code '' isn't a valid code value for variable (D192.V21)"*) — set
  `V_D192.V21=*All*`. The Compressed Mortality forms (D16/D74) do the
  opposite: they submit `V_<db>.V9` / `V10` **blank** and read blank as
  "all of the United States".
- **`dataset_id`** — D192 wants it (`<parameter><name>dataset_id</name>
  <value>D192</value></parameter>`) in addition to `dataset_code`.
- **113-list group-by on D176** — grouping `B_2 = D176.V4` also requires the
  radio `O_ucd = D176.V4`; D176's `V28` "15 Leading Causes" list refuses to
  combine with any other Group By.

---

## Hard rule: national only

The WONDER API refuses any location grouping or filter
(Region/Division/State/County/Urbanization) for mortality and natality — you
get a `<message>` and no data table, and `fetch.js` aborts. Keep every
`F_<DB>.V*` location filter at `*All*` (or blank for CMF), and never set a
`B_*` group-by to a location variable. Every row this pipeline stores is
national; `state_code` is always `'US'`.

---

## WONDER rate limit

The API rejects requests less than **15 seconds** apart (HTTP 429). Cron
staggers the eras; a manual loop needs `sleep 16` between `fetch.js` calls.

---

## Column contract (must match `lib/datasets.js`)

`fetch.js` reads each response row's `<c>` cells left to right: **group-by
variables first, then measures.**

### Per-cause mortality — `mortality_icd10.xml` / `_provisional_causes` / `_icd9_chapter` / `_icd8_chapter`

| cell | WONDER output | DB fields |
|---|---|---|
| 1 | Year | `year` |
| 2 | cause / chapter entry (label + `h=` depth) | `cause_code` (label verbatim, keeps leading `#`), `cause_name` (`#` stripped), `cause_level` (`h`) |
| 3 | Deaths | `death_count` |
| 4 | Population | `population` |
| 5 | Crude Rate | `crude_rate` |
| 6 | Age-Adjusted Rate | `age_adjusted_rate` |

The NCHS 113-list mixes roll-up categories, `#`-marked rankable causes, and
sub-detail; `cause_code.startsWith('#')` is the mutually-exclusive "leading
causes" set. The CMF chapter rows (D16/D74) are **never** `#`-prefixed, so
the ranked / "leading cause" views ignore them — they're deep-history
context only, and don't line up cause-for-cause across ICD revisions
(compare *within* an ICD version). Don't filter any rows out at ingest.

Non-numeric measure cells (`Suppressed`, `Unreliable`, `Not Applicable`,
`Missing`) → `NULL` + `status`; `Suppressed` on the Deaths cell also sets
`suppressed = 1`.

### All-cause mortality — `mortality_icd10_total.xml` / `mortality_provisional.xml`

Year only (`B_2..B_5 = *None*`). `fixed` in the era tags every row as a
synthetic non-`#` `cause_code = "All causes"`. Cells: year, Deaths,
Population, Crude Rate (+ Age-Adjusted for `icd10_total`; D176 provisional
doesn't expose it, so `provisional` has no `age_adjusted_rate` column).

### Monthly mortality — `mortality_monthly.xml`

`B_1 = Year`, `B_2 = D176.V1-level2` (Month), `O_dates = MONTH`. Own table
`mortality_monthly`. Cells: year, month, Deaths, Population, Crude Rate.
`mapRows.js` `kind:'month'` parses "Jan., 2021" / "2021/01" / a bare 1-12.
The trailing month is partial — the frontend flags it.

### Demographic mortality — `mortality_icd10_sex.xml` / `_race.xml`

`mortality_icd10.xml` + one extra Group By: `B_3 = D76.V7` (Gender) or
`D76.V8` (Race). Writes to the **separate `mortality_demographic`** table.
Cells: year, cause, subgroup, then the 4 measures. Many subgroup cells come
back `Suppressed` (1–9 deaths) — expected, stored NULL.
`build-snapshots.js` emits `/data/mortality_demographic.json`; the frontend
(`src/api/causeBreakdown.js`, the Breakdown control) stays hidden until that
file has real `dimensions`.

### Natality — `natality_mid.xml` (D66) / `natality_gap.xml` (D27)

Group By = **Year** (`<db>.V20`), `B_2..B_5 = *None*`. Two measure params:
`M_1` (`<db>.M1` — Births) and `M_5` (`<db>.M5`). `M_5` expands to **two**
response columns.

| response cell | value | DB field |
|---|---|---|
| 1 | Year | `year` |
| 2 | Births | `birth_count` |
| 3 | Female Population (15-44) | `population` |
| 4 | General Fertility Rate (per 1,000 women 15-44) | `fertility_rate` |

No year filter — `fetch.js` clips each era to its `datasets.js`
`[yearMin, yearMax]` (D66 now returns to 2024; the `mid` era keeps only
2007-2022). `build-snapshots.js` merges pre-2003 from the committed Socrata
`natality.json` baseline. `birth_rate` (crude, per 1,000 total population) is
not in these databases — it stays whatever the baseline had.

### Natality — `natality_current.xml` (D192)

**Provisional natality exposes Births + "Average X" measures ONLY — no
fertility / birth rate.** So this template requests `M_002` (`D192.M002` —
Births) alone and the `current` era is a **2-column** contract:

| response cell | value | DB field |
|---|---|---|
| 1 | Year | `year` |
| 2 | Births | `birth_count` |

`population` / `fertility_rate` / `birth_rate` stay NULL for D192 years —
the fertility rate for 2023+ isn't available from WONDER until CDC finalizes
those years into the Natality series. D192's newest year is partial
(e.g. "2026 through June 30") — the frontend must flag it.

---

## Testing a template

```
node --env-file=.env fetch.js --type=mortality --era=icd9 --years=1979-1985 --dry-run          # resolved XML, no network
node --env-file=.env fetch.js --type=mortality --era=icd9 --years=1979-1985 --out=rows.json --dump
```

`--out` writes mapped rows to JSON and never touches the database; `--dump`
saves WONDER's raw response as `<type>_<era>.raw.xml` (gitignored). On a
non-200, read the `<message>` in that raw file. Row count should be
`years × dimension cardinality` (e.g. 7 years × 17 ICD chapters = 119).

---

## If CDC retires or renumbers a database id

Re-point `databaseId` (and `yearMin`/`yearMax`) for that era in
`lib/datasets.js`, capture a fresh request body from the new form per above,
keep the filename. (This already happened once: pre-1979 Compressed
Mortality is **D74**, not D15 — on today's WONDER, D15 is the Tuberculosis /
OTIS system.)
