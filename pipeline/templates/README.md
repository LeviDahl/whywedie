# WONDER request templates

`fetch.js` does **not** build WONDER queries from scratch. It reads a request
XML document from this folder, does two tiny edits (`{{YEAR_LIST}}`
substitution, data-use consent), and POSTs it to
`https://wonder.cdc.gov/controller/datarequest/<DB>`.

```
mortality_icd10.xml       -> D76    Underlying Cause of Death, 1999-2020           [BUILT + TESTED]
mortality_icd10_total.xml -> D76    ... Year only = all-cause totals               [BUILT + TESTED]
mortality_monthly.xml     -> D176   ... Year x Month = monthly all-cause           [DRAFT — one test run to confirm month grouping]
mortality_icd10_sex.xml   -> D76    ... x Gender (V7)                              [BUILT + TESTED]
mortality_icd10_race.xml  -> D76    ... x Race (V8)                               [BUILT + TESTED]
mortality_provisional.xml -> D176   Provisional Mortality Statistics, 2018->now    [BUILT + TESTED — Year-only all-cause totals]
mortality_icd9.xml        -> D16    Compressed Mortality, 1979-1998               [TODO — no skeleton; needs WONDER params]
mortality_icd8.xml        -> D15    Compressed Mortality, 1968-1978               [TODO — no skeleton; needs WONDER params]
natality_mid.xml          -> D66    Natality, 2007-2022 (returns to 2024)         [BUILT + TESTED]
natality_gap.xml          -> D27    Natality, 2003-2006                           [BUILT + TESTED]
natality_current.xml      -> D192   Provisional Natality, 2023 through Last Month [PLACEHOLDER — needs its param set from WONDER]
```

### `mortality_icd10_sex.xml` / `mortality_icd10_race.xml` (D76) — DRAFT

The Causes-of-Death "Breakdown" data. Each is `mortality_icd10.xml` with
one extra Group By: `B_3 = D76.V7` (Gender) or `D76.V8` (Race) — the
standard D76 demographic variables. Response cells: year, cause, subgroup,
then M_1..M_4. They write to the **separate `mortality_demographic`**
table (eras `icd10_sex` / `icd10_race` in `lib/datasets.js`), so the main
`mortality` table / `mortality.json` are untouched. Confirm the extra
column is the subgroup and not something else:

```
node --env-file=.env fetch.js --type=mortality --era=icd10_sex  --years=2019 --out=rows.json --dump
node --env-file=.env fetch.js --type=mortality --era=icd10_race --years=2019 --out=rows.json --dump
```

`rows.json` should have ~130 causes × {2 sexes | 4 bridged-race groups} for
2019, `subgroup` = 'Male'/'Female' or the race label. Many subgroup cells
come back `Suppressed` (1–9 deaths) — expected; they store as NULL.
`build-snapshots.js` emits `/data/mortality_demographic.json`; the frontend
(`src/api/causeBreakdown.js`, the Breakdown control on Causes of Death)
stays hidden until that file has real `dimensions`.

### `mortality_provisional.xml` (D176) — DRAFT, Year-only

Covers 2021+ (D76 stops at 2020). D176's "15 Leading Causes" list (V4)
refuses to combine with any other Group By, and its 113-list variable
isn't confirmed — so this template groups by **Year only** and the
`provisional` era stores national **all-cause** yearly totals (deaths /
population / crude rate), tagged via `fixed` as a synthetic non-`#` "All
causes" cause. Enough to carry the page past 2020 with an honest
provisional total; per-cause provisional data is a later iteration.

```
node --env-file=.env fetch.js --type=mortality --era=provisional --years=2021 --out=rows.json --dump
```

One row per year, `death_count` / `population` / `crude_rate` populated →
good. D176's newest year is partial — flag it in the UI.

Commit these files — they contain no secrets and make the pipeline
reproducible.

### Natality eras — how they work

- **No year filter in the natality templates.** `fetch.js` clips each
  era's rows to its `datasets.js` `[yearMin, yearMax]`, so the WONDER
  databases can return whatever they like and the eras still don't
  collide (natality's UNIQUE key is just year+state). D66 now reaches 2024
  but the `mid` era keeps only 2007-2022; D27 is really "Natality,
  2003-2006".
- **build-snapshots.js merges pre-2003** from the committed Socrata
  `natality.json` baseline, so deep history (1960-2002) survives a
  pipeline run. DB rows win for any year they cover.
- `natality_mid.xml` / `natality_gap.xml` were built from the wonderapi
  `*_Defaults.xml` files: Group By `<db>.V20` (Year); measures `<db>.M1`
  (Births) + `<db>.M5` (yields Female Population 15-44 **and** General
  Fertility Rate); `O_show_totals=false`. Response columns: year, births,
  population, fertility_rate.

### ⚠️ D192 (`natality_current.xml`) still needs its parameter set

Its "expanded/provisional" param names differ from D66/D27 and aren't in
any public example — get them from WONDER (see the comment inside
`natality_current.xml`) and paste a working attempt (or its error) to
adapt. `fetch.js` clips to 2023+, so no year filter is needed.

### ⚠️ WONDER rate limit

The API rejects requests less than **15 seconds** apart (HTTP 429). Cron
staggers the eras, but a manual loop needs `sleep 16` between `fetch.js`
calls.

Recent-years *mortality* for Causes of Death (2021+) now has a draft
template + `datasets.js` era (`mortality_provisional.xml` / D176) — see
above; it needs one confirming `--dump` run. D76 alone covers 1999-2020.

---

## The web UI does NOT give you the API request

WONDER's interactive site POSTs a big flat form (`stage=results`,
`measures_list`, `group2`…`group10`, …). The **API** wants a completely
different envelope: `<request-parameters>` with `<parameter><name>B_1</name>
<value>…</value></parameter>` blocks, `stage=request`, `action-Send=Send`.
There is no `request_xml` field to copy out of DevTools.

So you don't "capture" templates — you **adapt them from
`mortality_icd10.xml`**, which is a known-good D76 request that has been run
against live WONDER and returns correctly-shaped data.

---

## Hard rule: national only

The WONDER API refuses any location grouping or filter
(Region/Division/State/County/Urbanization) for mortality and natality —
you get a `<message>` and no data table, and `fetch.js` aborts. Keep every
`F_<DB>.V*` location filter at `*All*` and never set a `B_*` group-by to a
location variable. Every row this pipeline stores is national; `state_code`
is always `'US'`.

---

## Building another era's template

Work from `mortality_icd10.xml`:

1. **Copy it** to the target filename.
2. **Swap the database id everywhere:** `D76` → `D16` (or `D15` / `D149` /
   `D66` / `D27`). This hits `B_*`, `M_*`, `F_*`, `I_*`, `O_*`, `V_*`,
   `VM_*`, `finder-stage-*` — a global find/replace of the string `D76`
   is correct.
3. **Set the group-by cause variable** (`B_2`) to that database's cause
   list. For D76 it's `D76.V4` = "ICD-10 113 Cause List". Other databases
   number their variables differently — find the right one from that
   database's variable list on wonder.cdc.gov, or CDC's API help. If a
   database has no 113-list, use its coarsest cause recode / chapter.
   `B_1` stays `<db>.V1-level1` (Year); `B_3..B_5` stay `*None*`.
4. **Measures** `M_1..M_4` = `<db>.M1..M4` (Deaths, Population, Crude Rate,
   Age-Adjusted Rate). If a database doesn't offer age-adjusted rate for
   this grouping, drop `M_4` **and** remove the `age_adjusted_rate` column
   from that era in `lib/datasets.js`.
5. **Year filter** `F_<db>.V1` keeps the literal `{{YEAR_LIST}}` token (no
   `<value>` children). `fetch.js` fills it with `--years=…` or the era's
   nominal span from `lib/datasets.js`.
6. **Natality** groups by Year only — `B_2` becomes `*None*`, and the
   column set is Year + Births + Population + Birth Rate (see the table
   below).
7. `O_precision` is `3` (keeps small rates from rounding to 0);
   `O_show_totals` is `false`; `O_timeout` is `300`.

### Test it

```
node fetch.js --type=mortality --era=icd9 --years=1990 --dry-run          # prints resolved XML, no network
node fetch.js --type=mortality --era=icd9 --years=1990 --out=rows.json --dump
```

`--out` writes mapped rows to JSON and never touches the database; `--dump`
saves WONDER's raw response as `<type>_<era>.raw.xml`. Inspect `rows.json`:
one year, ~100-130 cause rows, `death_count` / `population` / rates
populated. If it's empty or shifted, compare your `--dump` XML's `<c>` order
against the column contract below. Paste puzzling output and we'll adjust.

---

## Column contract (must match `lib/datasets.js`)

`fetch.js` reads each response row's `<c>` cells left to right: **group-by
variables first, then measures.**

### Mortality — `mortality_icd10.xml` / `_icd9` / `_icd8`

| cell | WONDER output | DB fields |
|---|---|---|
| 1 | Year | `year` |
| 2 | cause-list entry (label + `h=` depth) | `cause_code` (label verbatim, keeps leading `#`), `cause_name` (`#` stripped), `cause_level` (`h`) |
| 3 | Deaths | `death_count` |
| 4 | Population | `population` |
| 5 | Crude Rate | `crude_rate` |
| 6 | Age-Adjusted Rate | `age_adjusted_rate` |

The NCHS 113-list mixes roll-up categories, `#`-marked rankable causes, and
sub-detail. The pipeline stores **all** of it; `cause_code.startsWith('#')`
is the mutually-exclusive "leading causes" set, `cause_level` is the
indent depth for a tree view. Don't filter rows out at ingest.

Non-numeric measure cells (`Suppressed`, `Unreliable`, `Not Applicable`,
`Missing`) → `NULL` + `status`; `Suppressed` on the Deaths cell also sets
`suppressed = 1`. (WONDER hides suppressed rows by default, so at national
scale you'll see few or none.)

### Natality — `natality_mid.xml` (D66) / `natality_gap.xml` (D27) / `natality_current.xml` (D192)

Built from the wonderapi `*_Defaults.xml` skeletons. Group By = **Year**
(`<db>.V20`, `B_2..B_5` = `*None*`), then two measure params: `M_1`
(`<db>.M1` — Births) and `M_5` (`<db>.M5`). `M_5` expands to **two**
response columns — Female Population 15-44, then General Fertility Rate.
`O_show_totals` = `false`. No year filter (fetch.js clips).

| response cell | value | DB field |
|---|---|---|
| 1 | Year | `year` |
| 2 | Births | `birth_count` |
| 3 | Female Population (15-44) | `population` |
| 4 | General Fertility Rate (per 1,000 women 15-44) | `fertility_rate` |

`birth_rate` (crude, per 1,000 total population) is **not** in these
natality databases — it stays whatever the committed Socrata baseline had.

D192's params differ (see above); `natality_current.xml` is a placeholder
until you supply them.

The frontend reads `/data/natality.json` (`BirthStatisticsView.vue`, via
`src/api/natality.js`); the Socrata baseline (1960–2018) ships committed,
`build-snapshots.js` merges it with the DB rows.

---

## If CDC retires a database id

Re-point `databaseId` (and `yearMax`) for that era in `lib/datasets.js`,
rebuild the template from `mortality_icd10.xml` per above, keep the filename.
Nothing else changes.
