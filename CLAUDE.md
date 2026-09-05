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
  (D76 + D176); a separate **"Broad Chapters, 1968–1998"** section shows the
  D74/D16 ICD-chapter data as a multi-line trend. The breakdown reads
  `/data/mortality_demographic.json` (`src/api/causeBreakdown.js`, 1999–2025)
  and the control stays hidden until that file has real `dimensions`.
- **Birth Statistics** — annual births 1960–present + fertility/birth-rate
  toggle (`src/api/natality.js` reads `/data/natality.json`: Socrata
  baseline 1960–2018, then WONDER D27/D66 + D192 provisional; rate series
  stop earlier — see Next steps), Pew generation bands with drill-down on
  the births view, an `(i)` explainer for the three figures, plus monthly
  births (`src/api/monthlyBirths.js` → `/data/natality_monthly.json`, D192;
  Socrata `hmz2-vwda` fallback) + a YoY off the latest complete month.
- **Population Decline/Gain** — births vs deaths and the shrinking natural
  increase (1968–2025), plus the century birth history (1909–present) with
  Pew generation bands + drill-down. Births from `/data/natality.json`
  (+ Socrata `e6fc-ccez` for pre-1960), deaths from `/data/mortality.json`
  "All causes". Time-range tabs on each chart.
- **By the Numbers** — births/deaths as a per-day average: the last 12
  months of `mortality_monthly.json` + `natality_monthly.json` ÷ 365
  (`src/api/dailyStats.js`, Socrata `hmz2-vwda` fallback) next to rotating
  hand-curated "N per day" scale facts (`src/data/dailyFacts.js`, labelled
  as rough estimates).

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
- **Git:** this is a git repo (`git init -b main` already run), pushed to a
  **public** GitHub repo. Don't assume the current state — check
  `git status` / `git log` / `git remote -v` directly (this environment has
  real shell access). If there's anything uncommitted or unpushed, finish
  that as part of picking up this project.
- **Stage explicitly — never `git add -A` / `git add .` / `git add -u`.**
  List the exact paths you mean to commit (`git add src/foo.vue CLAUDE.md`).
  Running `build-snapshots.js` rewrites all of `public/data/*.json` (even a
  no-data run bumps `fetchedAt`), and a blanket add silently folds those —
  or anything else stray in the tree — into an unrelated commit (happened
  once: pipeline snapshots landed in a UI-only commit). Before every
  commit run `git status` and `git diff --cached --stat`, and only commit
  regenerated `public/data/*.json` when refreshing the data snapshot is
  the actual intent (then say so in the message). The repo is public —
  `git diff --cached` before pushing anything that touched a file that
  could carry a secret; `.env`, `.env.deploy`, `pipeline/.env`,
  `.secrets` are gitignored and must stay that way.

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
    causeNames.js             # plain-language labels for the rankable causes
    dailyFacts.js             # rough "N per year" scale facts for By the Numbers
  api/
    socrata.js                # generic data.cdc.gov Socrata (SODA) JSON client
    currentVitalEvents.js     # Socrata hmz2-vwda monthly births (fallback source for monthlyBirths.js)
    monthlyBirths.js          # monthly births from /data/natality_monthly.json (D192), Socrata fallback
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
  data/mortality_monthly.json # D176 monthly all-cause deaths
  data/natality.json         # committed Socrata baseline 1960-2018; pipeline/ extends it
  data/natality_monthly.json # D192 monthly births; committed stub until the era runs (Socrata fallback)
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
  contract; the fertility rate for these years now comes from
  `fetch-census-fertility.js` (Census PEP) instead of waiting on CDC to
  finalize them into the Natality series — see Remaining #2. D192's newest year is a
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

**Recently shipped (all deployed):** deaths 1968–2025 (D74/D16/D76/D176),
births 1960–present + D192 provisional (annual + monthly), Sex/Race
breakdown 1999–2025, "Broad Chapters, 1968–1998" on Causes of Death, Pew
generation bands + drill-down on both births-over-time charts, crude birth
rate backfilled to 2024 (births ÷ `mortality.json` population), Trend chart
range tabs, By-the-Numbers daily pace now off the monthly WONDER snapshots
(12 months ending ~mid-2026, not the stale Socrata table), Population
Change long view uses generations on a real calendar axis (was an "Year
1..N" era overlay), `.htaccess` cache headers (revalidate `/data/*.json`),
local `./deploy.sh` (build + lftp FTPS mirror), **Death Statistics annual
chart — Total-deaths / Age-adjusted-rate metric toggle, rate spliced back
to 1900** from Socrata `w9j2-ggv5` (counts stay 1968+), natural-increase
caption reworded off the old "since 1999" framing, **Home "pick a year"
shows the Pew generation** for the year (+ drops the partial trailing
natality year), **age-adjusted rate filled 2021–2025 from D176**
(`O_aar_enable`) so the annual-rate chart has no gap, **"Broad Chapters"
now 1968–2025** — ICD-10 chapter roll-up added (D76 `icd10_chapter` +
D176 `provisional_chapter` eras), COVID shows as a "Special-purpose
codes" line.

## Coverage by page (as of the last review)

| page / chart | span | notes |
|---|---|---|
| Home "pick a year" | births 1909–2025, deaths 1968–2025, **leading cause 1999–2025** | leading cause works to 2025 now (provisional_causes rows carry the `leading` flag); partial trailing natality year dropped; shows the Pew generation for the year |
| Death Statistics — annual, **counts** | 1968–2025 | monthly 2018–present |
| Death Statistics — annual, **age-adjusted rate** | **1900–2025** | pre-1968 from Socrata `w9j2-ggv5`; 1968–2025 WONDER (D176 provisional 2021+ now carries the age-adjusted rate — the `O_aar_enable` fetch ran). Socrata `489q-934x` (VSRR) stays wired as a fallback for years the snapshot lacks. All 2000-std, match at the seams. Metric toggle on the chart |
| Causes of Death — ranked | **1999–2025** | 113 list; a bar is a snapshot so no pre-1999 |
| Causes of Death — trend | ranked causes 1999–2025; **11 of them back to 1968** | pre-1999 = the ICD sub-chapter approximation (`PREHISTORY_MAP` in `causesOfDeath.js`), grey + flagged; `icd9_sub` / `icd8_sub` eras ran, deployed 2026-09 |
| Causes of Death — Sex/Race breakdown | 1999–2025 | race categories change at the 2020/2021 seam (bridged → single-race) |
| Causes of Death — Broad Chapters | **1968–2025** | ICD-8/9/10 chapters (D74/D16/D76/D176); seams at 1979 and 1999; ICD-10 eye/ear folded into "Nervous system & sense organs"; "Special-purpose codes" line = COVID-19 (U07.1), from 2020 |
| Birth Statistics — annual births | 1960–2025 | + generation bands |
| Birth Statistics — fertility rate | **1960–2023** | 2021–2023 from Census PEP (`fetch-census-fertility.js`; see Remaining #2); deployed 2026-09 |
| Birth Statistics — crude birth rate | 1960–2025 | 2019+ derived from births ÷ resident population |
| Birth Statistics — monthly births | 2023–2026 | D192 |
| Population Change — births vs deaths / natural increase | 1968–2025 | |
| Population Change — long view | 1909–2025 | |
| By the Numbers | 12 months ending ~mid-2026 | rolling annual ÷ 365 |

**Remaining:**

1. ~~ICD-10 chapter grain for 1999+~~ **DONE (deployed 2026-09).** Eras
   `icd10_chapter` (D76, 1999–2020) + `provisional_chapter` (D176, 2021+),
   templates with `B_2 → <db>.V2-level1` / `O_ucd → <db>.V2`. Snapshot
   carries ICD-8/9/10 chapter rows 1968–2025; `CHAPTER_CANON` +
   `buildChapters` (sums the ICD-10 nervous/eye/ear split) +
   `seams: [1979, 1999]` in `src/api/causesOfDeath.js`; "Broad Chapters"
   heading/copy are dynamic. "Codes for special purposes" (COVID-19,
   U07.1) shows as its own line from 2020. The *trend* chart now also runs
   11 rankable causes back to 1968 via the sub-chapter approximation
   (`PREHISTORY_MAP`, deployed 2026-09 — see the block below); a
   *continuous ranked-bar* view across the ICD seam is the remaining
   "Future effort".
2. ~~General fertility rate stops at 2020~~ **DONE for 2021–2023,
   deployed 2026-09.**
   D66 confirmed dead for this (births yes, `population`/`fertility_rate`
   "Not Available" past 2020) and Census PEP has no key-free path, so a
   Census API key was the move: `pipeline/fetch-census-fertility.js` (new,
   not a WONDER dataset — see its header) sums women aged 15–44 from the
   Census PEP `pep/charv` dataset (vintage 2023, the newest with an
   age/sex breakdown — vintages 2024/2025 don't exist yet, Census lags
   ~2yr) and writes `population`/`fertility_rate` into `natality` only for
   rows that have a `birth_count` but no rate yet — never overwrites
   WONDER's own finalized figures. Verified against the known 2019/2020
   WONDER values and the trend continues smoothly (56.27 / 55.97 / 54.51
   for 2021–2023, consistent with the documented COVID-era birth dip +
   rebound). `CENSUS_API_KEY` lives in `pipeline/.env` only (gitignored;
   template comment + `.env.example` entry added) — **never put a Census
   key in browser-side code**; this stays a pipeline-only credential.
   Frontend: `BirthStatisticsView.vue`'s fertility-rate line now trims
   trailing nulls (same fix as the Death Statistics rate chart) and marks
   2021+ dashed/grey (`FERTILITY_RATE_FINAL_THROUGH = 2020`) since it's
   Census-derived, not WONDER-published. Re-run
   `fetch-census-fertility.js` whenever — it's a no-op once a year is
   filled, and picks up new years automatically as Census publishes new
   vintages (next check: does vintage 2024 exist yet?).
3. Schedule the pipeline (host + cron + publish, `pipeline/README.md`) —
   only the `provisional*` / `monthly` / `current` eras recur (they now
   need `--years=2021-<last full year>` — see below); D76 / D66 / D27 /
   D16 / D74 are finalized, run once. `./deploy.sh` (or commit + a later
   pull) is the publish step.
4. Periodically re-check `hmz2-vwda`'s data currency (see ⚠️ above) — only
   still used for the pre-1960 birth history and as the By-the-Numbers /
   monthly-births fallback. **Re-checked 2026-09: still ends June 2024, no
   CDC refresh — the ⚠️ note stands.**
5. ~~Re-run the `provisional` mortality era with `O_aar_enable`~~ **DONE
   (deployed 2026-09).** The all-cause age-adjusted rate is now populated
   1900–2025 with no gap; D176 provides 2021–2025, `489q-934x` (VSRR)
   stays wired as a fallback.

**Recurring-run gotcha (learned 2026-09):** the D176 `provisional*` eras
carry `yearMax: 2030` as a clip ceiling. Run them with an explicit
`--years=2021-<last full year>` — an omitted `--years` used to POST
future years (HTTP 500); `fetch.js` now clamps to the current calendar
year, but you still want `--years` to drop the partial current year (a
half-year point is a cliff on the annual chart). `icd10_chapter` is D76
(`yearMax: 2020`) so it needs no `--years`. If `build-snapshots` ever
warns about an unmapped chapter label, add it to `CHAPTER_CANON` in
`src/api/causesOfDeath.js` (one line) and rebuild.

**On the 1909 / 1968 / 1999 start dates** (from a review question):

- **Births — 1909 is the real limit.** Nationwide US birth registration
  began in 1915 and wasn't complete until 1933; NCHS's own series starts
  1909 (Socrata `e6fc-ccez`). There is no authoritative earlier national
  count.
- **Deaths — 1968 is WONDER's limit, not the data's.** WONDER's oldest
  mortality DB is D74 (1968). The **age-adjusted rate now runs to 1900**
  via `w9j2-ggv5`; a pre-1968 *count* would need a historical crude rate +
  a historical US population series (Census intercensal), and pre-1933
  covers only the expanding death-registration area — not attempted.
- **Leading cause — 1999 is the 113-list (ICD-10) limit.** Pre-1999 ships
  at ICD-chapter grain ("Broad Chapters"). Finer is possible: D16/D74 also
  expose the **"ICD-9 72 Groups" / "ICD-8 69 Groups"** intermediate lists
  (~70 causes, seen on their request forms as `D16.V4-level1` /
  `D74.V4-level1`) — a `--dump` away. A *continuous* ranked view across the
  ICD-8/9/10 seam still needs the comparability crosswalk (Future effort).

**Enhancement noted in review — done:** the Home "pick a year" panel now
shows the Pew generation a birth year falls in (a text label under the
birth count, via `generationForYear()` in `src/data/generations.js`; blank
for pre-1928 years Pew doesn't name). Same pass: `yearFacts.js` drops the
trailing partial natality year (D192 "through <month>") so a half-year
birth count no longer shows as an annual figure, and its caption was
corrected (deaths 1968–, leading cause 1999–, births to the real max).

**Pre-1999 rankable-cause trends (shipped 2026-09):**
WONDER's Compressed Mortality DBs (D16/D74) don't carry the 113-cause
list, and there's no NCHS "72 causes" list on them either — the finest
cause grain is the ICD *sub-chapter* (~130 code-range groups, eras
`icd9_sub` / `icd8_sub`, `B_2 = <db>.V2-level2`). `PREHISTORY_MAP` in
`src/api/causesOfDeath.js` maps the sub-chapters that line up with an
ICD-10 113-list cause (single group or a clean sum) → `buildPrehistory`
sums them per year → the Trend chart extends **11 rankable causes** back
to 1968: heart disease, cancer, stroke, chronic lung disease, flu &
pneumonia, accidents, suicide, homicide, kidney disease, TB, nutritional
deficiencies. Rendered grey + a caption ("approximation … read the trend,
not the step at 1979/1999"); the ranked BAR chart stays 1999+ (a bar is a
snapshot). **Not a comparability-ratio crosswalk** — counts are raw, so a
line can step at a seam. Heart disease runs slightly LOW pre-1999
(hypertensive heart disease is bundled with hypertensive renal in one
ICD-9/8 sub-chapter, unsplittable). Causes not in `PREHISTORY_MAP`
(diabetes, cirrhosis, Alzheimer's, …) stay 1999+ — bundled too coarsely
pre-1999. A true ratio-adjusted crosswalk is still possible but is a
much bigger job and isn't needed for "how did heart disease / cancer /
stroke move since the 1970s".

WONDER API rate limit: ≥15 s between requests (429 otherwise); a manual
loop needs `sleep 16` between `fetch.js` calls.
