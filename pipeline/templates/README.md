# WONDER request templates

`fetch.js` does **not** build WONDER queries from scratch. It reads a request
XML document from this folder, does two tiny edits (`{{YEAR_LIST}}`
substitution, data-use consent), and POSTs it to
`https://wonder.cdc.gov/controller/datarequest/<DB>`.

```
mortality_icd10.xml   -> D76    Underlying Cause of Death, 1999-2020   [BUILT + TESTED]
mortality_icd9.xml    -> D16    Compressed Mortality, 1979-1998       [TODO]
mortality_icd8.xml    -> D15    Compressed Mortality, 1968-1978       [TODO]
natality_modern.xml   -> D149   Natality, 2016+                       [TODO]
natality_mid.xml      -> D66    Natality, 2007-2015                   [TODO]
natality_old.xml      -> D27    Natality, 1995-2002                   [TODO]
```

Commit these files — they contain no secrets and make the pipeline
reproducible. (`D176`, the 2018→last-week single-race series, is a planned
*additional* mortality era for recent years — not a replacement for D76.)

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

### Natality — `natality_modern.xml` / `_mid` / `_old`

| cell | WONDER output | DB fields |
|---|---|---|
| 1 | Year | `year` |
| 2 | Births | `birth_count` |
| 3 | Female Population (15-44), or Total Population if that's all the era gives | `population` |
| 4 | Birth Rate (crude, per 1,000) | `birth_rate` |

If an era returns only Births, trim its `columns` in `lib/datasets.js` to
`[{ kind: 'year' }, { kind: 'measure', field: 'birth_count', countField: true }]`.

---

## If CDC retires a database id

Re-point `databaseId` (and `yearMax`) for that era in `lib/datasets.js`,
rebuild the template from `mortality_icd10.xml` per above, keep the filename.
Nothing else changes.
