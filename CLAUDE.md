# CLAUDE.md — Why We Die (whywedie.org)

Interactive site tracking US death, birth, and population statistics,
sourced live from CDC's open data platform (data.cdc.gov). Open site, no
authentication.

## Current state

All six sidebar sections are live (Home, Death Statistics Over Time, Causes
of Death, Birth Statistics, Population Decline/Gain, By the Numbers).

- **Death Statistics** — annual all-cause deaths **1968–present** (WONDER
  snapshot: D74/D16 → D76 → D176) + current-monthly deaths (D176 snapshot),
  each with 10/25/50/Max range tabs.
- **Causes of Death** — ranked bar + trend line, deaths / crude-rate /
  age-adjusted-rate toggle, overlay multiple **periods** (years or decade
  ranges, as mean annual values) and multiple **causes**, friendly ↔
  official cause-name toggle, and an optional **Breakdown** (None / Sex /
  Race) that splits the bars/lines by subgroup for one period. Data: CDC
  WONDER national, from `/data/mortality.json` — 113-cause list 1999–2025
  (D76 + D176), ICD-chapter grain 1968–1998 once those eras are loaded; the
  breakdown
  reads a separate `/data/mortality_demographic.json` (`src/api/
  causeBreakdown.js`) and the control stays hidden until that file has
  real `dimensions`. See pipeline note below.
- **Birth Statistics** — annual births 1960–present + fertility/birth-rate
  toggle (`src/api/natality.js` reads `/data/natality.json`: Socrata
  baseline 1960–2018, then WONDER D27/D66 + D192 provisional; rate series
  stop earlier — see Next steps), Pew generation bands on the births view,
  an `(i)` explainer for the three figures, plus provisional monthly births
  + rough YoY (Socrata `hmz2-vwda`).
- **Population Decline/Gain** — births vs deaths and the shrinking natural
  increase, plus the century birth history. Births from `/data/natality.json`
  (+ Socrata `e6fc-ccez` for pre-1960), deaths from `/data/mortality.json`
  "All causes"; overlap 1999–2022. Time-range tabs on each chart.
- **By the Numbers** — births/deaths as a per-day average (`hmz2-vwda`
  12-month-ending ÷ 365) next to rotating hand-curated "N per day" scale
  facts (`src/data/dailyFacts.js`, clearly labelled as rough estimates).

**The site itself is static — no server, no build-time data fetch.** It
either calls Socrata directly from the browser, or reads a committed JSON
file. Do **not** add a backend/proxy *to the site*.

`/data/mortality.json` is produced out-of-band by **`pipeline/`** — a
standalone Node job (its own `package.json`; never imported by the app) that
POSTs XML to the CDC WONDER API, parses it, upserts to a MySQL database, and
emits the JSON snapshot. It runs off-box (GoDaddy's cPanel has no Node
runtime) on its own schedule. An earlier version of the WONDER integration
was an always-on Node/Express proxy in `server/` — that's gone; the pipeline
is a batch job that writes a file, not a request-time service. Full detail
in [`pipeline/README.md`](pipeline/README.md). Note: **the WONDER API is
national-only for vital statistics** — it refuses State/County/Region
grouping, so every pipeline row is US-wide.

## Development Environment

- **OS Platform:** macOS (Darwin). Use Unix-compliant commands only.
- **Runs directly on the user's Mac** — there's no separate sandbox for this
  project; `npm install` / `npm run build` / git commands operate on the
  real local filesystem and the real repo. Stay scoped to the project root:
  don't modify, write, or read files outside it, and don't touch global
  user config (`~/.zshrc`, `~/.npmrc`, etc.) or other system-level settings.

## Build & Verification Commands

Only these are actually configured right now — don't assume others exist:

- **Install dependencies:** `npm install`
- **Development server:** `npm run dev`
- **Production build:** `npm run build`
- **Preview production build:** `npm run preview`

There is no TypeScript, ESLint, or test runner configured yet. If any of
those get added later, update this section (and `package.json`'s `scripts`)
to match — don't reference `type-check` / `lint` / `test:unit` commands
until they actually exist, since that misleads whoever (human or Claude)
reads this file next. With real local shell access, actually run
`npm run build` before considering a change done — don't just reason about
whether it would pass.

## Deployment & Git

- **Hosting:** whywedie.org is on GoDaddy shared hosting (cPanel), served as
  static files from `public_html`. SSL is handled by GoDaddy's AutoSSL —
  already set up, shouldn't need attention.
- **Deploy process:** `npm run build` → upload the **contents** of `dist/`
  (not the `dist` folder itself) into `public_html`, via cPanel File Manager
  or FTP. `public/.htaccess` is copied into `dist/` automatically by the
  build and does two jobs in one `<IfModule mod_rewrite.c>` block — keep
  them together, don't split them apart:
  1. Redirects plain `http://` to `https://`
  2. Vue Router history-mode fallback (serves `index.html` for any route
     that isn't a real file/directory, so a direct link or a refresh on
     e.g. `/death-statistics` doesn't 404)

  These were accidentally split apart once already — the HTTPS redirect got
  dropped when `.htaccess` was rewritten to add the Vue Router rule, since
  the redirect had originally been added by cPanel's AutoSSL flow rather
  than living in this repo's source `.htaccess`. Now that it's folded into
  the same file/block, it survives every future build — don't regenerate
  `.htaccess` from scratch without carrying both rules forward.
- **⚠️ GoDaddy zip-extract permissions, hit more than once:** extracting an
  upload in cPanel File Manager can leave files/dirs with permissions Apache
  can't read → a generic 403 for the whole site even though every file looks
  present. Two known cases: (a) `public_html` *itself* ends up not `755`;
  (b) `.htaccess` extracts as `600` (owner-only), which Apache can't read.
  After any File Manager extract: `public_html` = `755`, every file = `644`
  (dirs `755`), and specifically confirm `.htaccess` is `644`. Check this
  before suspecting the `.htaccess` rules or the app.
- **`/data/mortality.json`** must exist at the site root in production (the
  Causes of Death page fetches it). It's committed in `public/data/` so a
  plain `dist/` upload includes it; the `pipeline/` publish step later
  overwrites it on the server with fresher data. Don't let a site redeploy
  clobber a newer pipeline-published file with the committed baseline —
  re-run the pipeline publish after a deploy, or exclude `data/` from the
  upload.
- **Git:** this is a git repo (`git init -b main` already run), intended to
  be pushed to a new public GitHub repo. Don't assume the current state —
  check `git status` / `git log` / `git remote -v` directly (this
  environment has real shell access, unlike some earlier sessions that
  worked on this file through a broken remote-device bridge and could only
  hand off manual commands). If there's anything uncommitted or unpushed,
  finish that as part of picking up this project.

## Architecture & Code Conventions

- Always use the **Vue 3 Composition API** with `<script setup>`. Never use
  the Options API, mixins, or shallow-reactivity tricks.
- **This project is plain JavaScript, not TypeScript.** Components use
  `<script setup>` (no `lang="ts"`). If the project migrates to TypeScript
  later, switch to `lang="ts"` and type-only `defineProps<{...}>()` /
  `defineEmits<{...}>()` generics at that point — until then, use the
  runtime-declaration form actually used throughout this codebase:
  ```js
  const props = defineProps({ title: { type: String, required: true } })
  const emit = defineEmits(['change'])
  ```
- **State Declaration:** Prefer `ref()` for local reactive values. Use
  `reactive()` only for stable, never-reassigned object stores.
- **Reactivity Rules:** Never destructure a `reactive()` object directly —
  it destroys reactivity. Use `toRefs()` if destructuring is required.
- **Two-Way Binding:** Use `defineModel()` for component `v-model` handling
  instead of manual `props.modelValue` boilerplate.
- **Computed & Side Effects:** Use `computed()` for derived state — keep it
  pure, no side effects. Use `watch()`/`watchEffect()` for async or DOM side
  effects; add `flush: 'post'` if a watcher needs to read the updated DOM.

### State management & routing

- **No Pinia yet — nothing in this project needs shared/global state at the
  moment.** `src/nav.js` is the single source of truth for the 6 sidebar
  sections (path, name, shortLabel, label, description); both the
  router and the sidebar read from it. When a real feature needs state
  shared across components (e.g. a chart's selected year range persisting
  across a page), add **Pinia** with setup-style stores
  (`defineStore('id', () => { ... })`), split by bounded sub-domain rather
  than one monolith store.
- **Routing:** Vue Router 4, with routes generated from `src/nav.js` in
  `src/router/index.js`. Keep using explicit lazy-loaded route components
  (`component: () => import(...)`) for code-splitting — this is already the
  pattern in place.

## macOS-Specific Guidelines

- **Case Sensitivity:** macOS (APFS) is typically case-insensitive but
  case-preserving; Linux-based build/CI environments are case-sensitive.
  Make sure imports match file casing exactly on disk.
- **System Junk:** Ignore `.DS_Store` entirely (already in `.gitignore`).
- Don't request host macOS permissions, system keychains, or system
  notifications — nothing here needs them.

## Project structure

```
src/
  nav.js                     # single source of truth for the 6 sidebar sections
  router/index.js            # routes generated from nav.js
  App.vue                    # app shell: sidebar + mobile top bar + page transitions
  style.css                  # Tailwind import, black/white design tokens, component classes
  charts/
    palette.js                # validated color palette for chart MARKS only (chrome stays mono)
  data/
    causeNames.js             # friendly labels for the 49 rankable causes
    dailyFacts.js             # rough "N per year" scale facts for By the Numbers
  api/
    socrata.js                # generic data.cdc.gov Socrata (SODA) JSON client
    currentVitalEvents.js     # current monthly births (Socrata hmz2-vwda)
    monthlyDeaths.js          # monthly all-cause deaths from /data/mortality_monthly.json
    historicalDeaths.js       # annual all-cause deaths from /data/mortality.json "All causes"
    causesOfDeath.js          # reads /data/mortality.json (from pipeline/), reshapes for the view
    causeBreakdown.js         # reads /data/mortality_demographic.json — Sex/Race breakdown (optional)
    populationChange.js       # births (natality.json + e6fc-ccez) vs deaths (mortality.json) + natural increase
    dailyStats.js             # hmz2-vwda 12-month-ending births/deaths, for the daily average
    yearFacts.js              # per-year births/deaths/leading-cause for the Home "pick a year" panel
    natality.js               # annual births + fertility rate from /data/natality.json (+ monthly roll-up)
  lib/
    csv.js                    # toCsv / downloadCsv helpers
  composables/
    useAsyncData.js          # shared loading/error/data helper for section views
    useNamePreference.js     # friendly vs official cause names, persisted (localStorage)
  components/
    AppSidebar.vue           # sidebar nav (desktop: static, mobile: slide-in drawer)
    NavIcon.vue               # inline SVG icons per section (one v-if branch per section name)
    PageHeader.vue            # consistent page title/description header
    YearLookup.vue            # Home "in the year N" cross-section lookup
    RangeTabs.vue             # segmented control for a chart's time window
    TimeSeriesChart.vue       # Chart.js line chart — single- OR multi-series (pass `series`)
    RankedBarChart.vue        # Chart.js horizontal bars — single- OR multi-series (period compare)
    ChartToolbar.vue           # Table / CSV / Copy-link row under a chart
    DataTable.vue              # sortable table of a chart's underlying rows
  views/
    HomeView.vue              # project overview (built out)
    DeathStatisticsView.vue   # annual chart + monthly chart, each with own caveats
    CausesOfDeathView.vue     # ranked bars (compare periods) + trend (compare causes)
    BirthStatisticsView.vue   # provisional monthly births + YoY
    PopulationChangeView.vue  # births vs deaths, natural increase, century birth history
    ByTheNumbersView.vue      # births/deaths as a daily average + rotating scale facts
public/
  .htaccess                  # Apache: HTTPS redirect + Vue Router history-mode fallback
  data/mortality.json        # committed baseline snapshot; pipeline/ refreshes it in prod
  data/mortality_demographic.json  # Sex/Race breakdown; committed stub (empty dimensions) until pipeline eras run
  data/natality.json         # committed Socrata baseline 1960-2018; pipeline/ extends it
pipeline/                    # standalone Node job: CDC WONDER -> MySQL -> /data/*.json
                             #   own package.json (axios, mysql2, fast-xml-parser); see its README
```

Adding a 6th sidebar section: add an entry to `nav.js`, add a view file, add
it to the `viewComponents` map in `router/index.js`. Adding a new live-data
section: see "data.cdc.gov / Socrata API" below, or `pipeline/README.md` for
a WONDER-backed one.

## Design system

The **chrome** — sidebar, headers, buttons, cards, stat numbers, page
copy — is strictly black, white, and gray, no color. Tokens live in
`src/style.css` under `@theme` (`--color-ink`, `--color-paper`,
`--color-line`, `--color-muted`, etc.). Reusable component classes
(`.btn-primary`, `.btn-secondary`, `.card`, `.badge`, `.link-underline`)
keep buttons/links/cards consistent — rounded corners, subtle shadows,
hover/active states, visible focus rings (never remove `:focus-visible`).
Font is Inter (Google Fonts) with a system-font fallback.

**Charts are the one exception**: chart *marks* (bars, lines) may use
color, so multiple series and period-vs-period comparisons stay legible.
The palette is `src/charts/palette.js` — a validated categorical set (blue,
orange, aqua, yellow) from the `dataviz` skill's reference palette. Rules:
assign slots in fixed order (never cycle/recolor on filter change); a
legend is always shown for 2+ series and line series also carry a dash
pattern (identity never rests on color alone); axis/grid/tooltip stay in
the gray tokens; text never wears a series color. If you add or change
chart colors, re-run the skill's `validate_palette.js` first.

## data.cdc.gov / Socrata API — read before touching a Socrata-backed section

Socrata is the *browser-direct* data path (Death Statistics). It stays that
way — no proxy — only if every Socrata pipeline follows these rules. (The
WONDER path is different and lives in `pipeline/`; see its README.)

- **JSON over GET, with CORS.** Call `src/api/socrata.js`'s `socrataQuery()`
  directly from view/composable code — no proxy, no backend. (CORS support
  itself wasn't confirmed from a browser in the environment this was built
  in, since it had no network path to data.cdc.gov either — it's
  well-documented Socrata platform behavior, but if a brand-new dataset
  query ever fails with a CORS error specifically, that's the one part of
  this assumption worth re-checking.)
- **Always test a new dataset's real shape before building against it** —
  don't assume field names or "obvious" filters from the dataset title.
  Every existing pipeline here needed at least one non-obvious correction
  found by actually querying it (see the two ⚠️ items below) — assume the
  next one will too. Query it directly (a browser URL bar works fine for
  `https://data.cdc.gov/resource/<id>.json?...` — these are just GET
  requests) before writing the module.
- **SoQL, not raw string params.** Use `$select` / `$where` / `$group` /
  `$order` per [Socrata's query docs](https://dev.socrata.com/docs/queries/).
  `socrataQuery()` takes care of URL-encoding — don't hand-encode `$where`
  clauses.
- **Do aggregation server-side** (`sum()`, `count()`, `$group`) rather than
  pulling raw rows and summing client-side — see `historicalDeaths.js` for
  the pattern (annual rollup of a weekly dataset via one query).

### ⚠️ `hmz2-vwda` (current monthly births/deaths) is not actually current

Confirmed by querying it directly while building this: its most recent
record is **June 2024**, despite being labeled CDC's "current provisional"
table on a nominally quarterly refresh schedule. It's still the most
current source CDC publishes for this figure — `currentVitalEvents.js` and
the Death Statistics page surface the real latest date rather than assuming
it means "now." Worth periodically re-checking whether CDC has resumed
updating it or replaced it with a new dataset ID — if a fresher one turns
up, swap `DATASET_ID` in `currentVitalEvents.js`, the query shape should
carry over directly.

### Causes of Death no longer uses Socrata

It used to (`bi63-dtpu`, 1999–2017, national). It now reads
`/data/mortality.json` produced by **`pipeline/`** from CDC WONDER — `D76`
(1999–2020) + `D176` provisional (2021+) at the NCHS 113-cause list, plus
`D16`/`D74` at ICD-chapter grain for 1979–1998 / 1968–1978; national,
deaths + population + crude + age-adjusted rate.
`src/api/causesOfDeath.js` just fetches that file and reshapes it;
there is no live API call for this page. Everything about the WONDER side —
the national-only constraint, the `#`-prefixed "rankable" cause convention,
the template format, the schema — is in `pipeline/README.md` and
`pipeline/templates/README.md`. Don't reach for `bi63-dtpu` again.

### ⚠️ Don't silently sum an in-progress period

Any monthly/weekly source has a partial trailing period. The D176
provisional annual total treats the current calendar year as partial (its
era run stops at the last full year); `monthlyDeaths.js` flags a trailing
month under 80% of the recent median; the frontend renders those muted +
dashed. Follow the same pattern for any future rollup — never show a
half-filled period next to full ones un-flagged.

### Socrata vs. CDC WONDER — two strategies on purpose

- **Socrata**: browser calls it directly, zero infrastructure, but CDC
  trims/stalls the datasets (see the ⚠️ on `hmz2-vwda`). Now only the
  monthly-births chart, the By-the-Numbers daily pace, and the pre-1960
  birth history.
- **CDC WONDER** (everything else): finalized multi-decade data with rates,
  but XML/POST, no CORS, national-only — so it needs `pipeline/` (a
  scheduled batch job writing static files, *not* a request-time proxy).

Done for Death Statistics: the annual chart is the WONDER `icd10_total`
(D76, 1999–2020) + `provisional` (D176, 2021+) "All causes" series, and
monthly is `mortality_monthly` (D176 × Month). Same move for any other
section that outgrows Socrata — a WONDER pipeline era, not a stretched
Socrata query.

## Next steps

**Done + deployed:**

- D76 mortality (1999–2020), natality `mid` D66 (2007–2022) + `gap` D27
  (2003–2006) — `mortality.json` per-cause 1999–2025 (D76 + D176),
  `natality.json` 1960–2022 (pre-2003 merged from the Socrata baseline;
  D192 2023+ once loaded).
- **Sex / Race breakdown for Causes of Death** — eras `icd10_sex` /
  `icd10_race` (D76 × `D76.V7` Gender / `D76.V8` Race) write the separate
  `mortality_demographic` table → `/data/mortality_demographic.json`
  (1999–2020, ~132 causes; race = the 4 bridged-race groups). Frontend:
  `src/api/causeBreakdown.js` + the "Breakdown" segmented control on
  `CausesOfDeathView.vue`. A breakdown collapses period-compare to one
  period, and Race defaults the metric to age-adjusted rate. The control
  hides itself if `mortality_demographic.json` has empty `dimensions`.
- **D176 provisional all-cause totals 2021–2024** — era `provisional`,
  Year-only (D176's "15 Leading Causes" list won't combine with any other
  Group By). Written to `mortality` as a synthetic non-`#` "All causes"
  cause; `causesOfDeath.js` filters it out of the cause-level UI and keeps
  `years` / `coverage.yearMax` at 2020. Not surfaced anywhere yet —
  banked for a future "total deaths through <year>" callout.
- **D176 per-cause 2021–2025** — era `provisional_causes`
  (`mortality_provisional_causes.xml`), D176 grouped by Year × UCD ICD-10
  113 Cause List (`B_2 = D176.V4` **with** `O_ucd = D176.V4` — the "button"
  the earlier attempts were missing), age-adjusted rate enabled. Same 6-col
  contract + `mortality` table as `icd10`, so `causesOfDeath.js` picks it
  up with no frontend change. Causes of Death now spans **1999–2025**
  (`coverage.yearMax` 2025). Committed in `mortality.json`.

**Tabled — possible enhancement:** period/decade comparison *inside* a
Sex/Race breakdown. Blocked today because the ranked bar chart has one
color axis and the breakdown already spends it on the subgroup. Paths if
revisited: (a) a **single-cause** mode — bars grouped subgroup × decade
(~8 bars, readable); (b) a different chart type (small multiples, or
slope/dumbbell per subgroup). The trend chart already covers
subgroup-over-time for one cause. Don't try to cram top-15 × subgroups ×
decades onto one bar chart.

- **D192 provisional births** — era `current` / `natality_current.xml`,
  rebuilt from the real D192 request form and validated against live WONDER
  (2023 = 3,596,017, exact NCHS match; 2024/2025/2026 also returned). **D192
  has no fertility/birth-rate measure** — provisional natality is Births +
  "Average X" only — so the era is a **2-col** `[year, birth_count]`
  contract and the fertility rate past 2022 is unavailable until CDC
  finalizes those years into the Natality series. D192's newest year is a
  partial (e.g. "2026 through June 30") — must render flagged. Key params
  the D149 skeleton was missing: `O_PR=false`, `dataset_id=D192`,
  `V_D192.V21=*All*` (blank is rejected).
- **Pre-1999 mortality at ICD-chapter grain** — eras `icd9` (**D16**,
  1979–1998) / `icd8` (**D74**, 1968–1978), templates
  `mortality_icd9_chapter.xml` / `mortality_icd8_chapter.xml`, both built
  from their real CMF request forms and validated (119 / 85 rows for the
  test ranges = years × 17 chapters). Year × ICD Chapter
  (`<db>.V2-level1`) + Deaths / Population / Crude / Age-Adjusted Rate —
  same 6-col contract + `mortality` table as `icd10`; rows are non-`#` so
  the ranked view ignores them. **Coarse by design:** chapter grain lines
  up with the ICD-10 chapter roll-ups, so no ICD-9/8→ICD-10 crosswalk.
  (`D15` on today's WONDER is the Tuberculosis / OTIS system — pre-1979
  Compressed Mortality is `D74`.) CMF gotchas: `O_aar=aar_std` must
  accompany the `O_aar_enable=true` checkbox; location `V_` fields go
  **blank** (CMF reads blank as all-US).

**Done since:** D192 births + D16/D74 chapter data + `icd9_total` /
`icd8_total` all-cause totals run to MySQL and committed —
`mortality.json` carries a continuous "All causes" row **1968–2025**
(1930082 deaths / AAR 1303.6 in 1968 → 3096850 in 2025), so the Death
Statistics annual chart runs 1968→present and its source label names all
three databases. `natality.json` is 1960–2026.
Frontend: `natality.js` flags the partial trailing calendar year
(< 70% of the prior year → dropped from the plotted line, shown as a
caption); Birth Statistics has an `(i)` popover explaining Births /
Fertility rate (general, not total) / Birth rate, and **Pew generation
bands** on the annual-births chart (`TimeSeriesChart` `bands` prop —
faint fill + divider + label per cohort, Births metric only) with an
On/Off toggle and per-cohort drill-down (a cohort button — or clicking a
band — zooms the x-range to that generation's birth years; `TimeSeriesChart`
emits `bandClick`); Death Statistics annual range tabs are 10/25/50/Max.
`historicalDeaths.js` source label is derived from the actual first year.

**Remaining:**

1. **Surface the 1968–1998 ICD-chapter rows on Causes of Death** — a
   chapter view / decade buttons. They load harmlessly today (non-`#`,
   ignored by `causesOfDeath.js`) but nothing displays them. The real work
   is a **cross-revision chapter-label crosswalk**: ICD-8 "Diseases of the
   circulatory system (390-458)" ≠ ICD-9 "(390-459)" ≠ ICD-10 "(I00-I99)",
   so a ~17-row map is needed to stitch each chapter into one continuous
   series. `causesOfDeath.js` would gain a `byChapter` shape from the
   non-`#` rows.
2. **Sex / Race breakdown stops at 2020** — eras `icd10_sex` / `icd10_race`
   are D76-only (`mortality_demographic.json` 1999–2020). Extend to 2021+
   with a D176 era: Year × `D176.V4` (113 list, with `O_ucd=D176.V4`) ×
   `D176.V7` (Sex) or D176's single-race var (`V42`/`V43`/`V44`), writing
   to `mortality_demographic`. `V4` combines with other Group Bys (unlike
   `V28` "15 Leading Causes"), so this is a template + era + one `--dump` to
   confirm the 3-deep grouping holds. Race groups will be single-race
   (not the D76 bridged-race 4), so the frontend legend/labels need a note
   that the pre/post-2020 race categories differ.
3. **Rate series that stop early — need a non-WONDER denominator:**
   - **Fertility rate → 2020.** `natality.json` has births 2021–2026 but no
     fertility rate past 2020 (D66's `mid` era returned no rate for
     2021–22; D192 has no rate measure). Try D149 ("Natality, 2016–2022
     expanded"), or compute births ÷ Census female-population-15-44.
   - **Birth rate (crude, per 1,000 people) → 2018.** Only ever came from
     the committed Socrata baseline; no WONDER natality DB exposes it. For
     2019+ it's births ÷ Census total population — needs a Census/ACS
     population series added as a source.
   The "Fertility rate" / "Birth rate" toggles on Birth Statistics are
   empty past those years; re-check periodically.
4. **Monthly births chart stops mid-2024** — `currentVitalEvents.js` still
   reads Socrata `hmz2-vwda`, which CDC trimmed to a rolling window and
   stopped refreshing past June 2024 (the same table monthly *deaths* were
   moved off). Fix: a `natality.monthly` era = D192 grouped by Year × Month
   (`B_1=D192.V20`, `B_2=D192.V25`, `M_002`), a `natality_monthly` table +
   `buildNatalityMonthly()` snapshot fn, and a `monthlyBirths.js` that reads
   it (falling back to Socrata) — a direct mirror of the `mortality_monthly`
   / `monthlyDeaths.js` work. Needs one `--dump` to confirm the month
   grouping, like the others.
5. Schedule the pipeline (host + cron + publish, `pipeline/README.md`) —
   only the `provisional` / `provisional_causes` / `monthly` / `current`
   eras recur; D76 / D66 / D27 / D16 / D74 are finalized, run once.
6. Periodically re-check `hmz2-vwda`'s data currency (see ⚠️ above).

**Future effort — fine-grained pre-1999 causes:** a 113-list-equivalent
ICD-9/ICD-8 cause breakdown (vs. the coarse chapter grain shipping first).
Needs an ICD-9→ICD-10 and ICD-8→ICD-10 comparability-ratio crosswalk —
NCHS publishes comparability studies, but applying them per cause is real
work. Chapter-level answers "how did heart disease / cancer / accidents
move since the 1970s" without it.

WONDER API rate limit: ≥15 s between requests (429 otherwise); a manual
loop needs `sleep 16` between `fetch.js` calls.
