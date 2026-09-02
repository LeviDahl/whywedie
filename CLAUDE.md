# CLAUDE.md — Why We Die (whywedie.org)

Interactive site tracking US death, birth, and population statistics,
sourced live from CDC's open data platform (data.cdc.gov). Open site, no
authentication.

## Current state

All six sidebar sections are live (Home, Death Statistics Over Time, Causes
of Death, Birth Statistics, Population Decline/Gain, By the Numbers).

- **Death Statistics** — annual + current-monthly death charts (Socrata).
- **Causes of Death** — ranked bar + trend line, deaths / crude-rate /
  age-adjusted-rate toggle, overlay multiple **periods** (years or decade
  ranges, as mean annual values) and multiple **causes**, friendly ↔
  official cause-name toggle, and an optional **Breakdown** (None / Sex /
  Race) that splits the bars/lines by subgroup for one period. Data: CDC
  WONDER national 1999–2020, from `/data/mortality.json`; the breakdown
  reads a separate `/data/mortality_demographic.json` (`src/api/
  causeBreakdown.js`) and the control stays hidden until that file has
  real `dimensions`. See pipeline note below.
- **Birth Statistics** — annual births + fertility rate (`src/api/natality.js`
  reads `/data/natality.json`; Socrata `89yk-m38d` baseline 1960–2018,
  WONDER natality pipeline extends it) plus provisional monthly births +
  rough YoY (Socrata `hmz2-vwda`).
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
`/data/mortality.json` produced by **`pipeline/`** from CDC WONDER database
`D76` (1999–2020, national, deaths + population + crude + age-adjusted
rate). `src/api/causesOfDeath.js` just fetches that file and reshapes it;
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
  (2003–2006) — `mortality.json` 1999–2020, `natality.json` 1960–2022
  (pre-2003 merged from the Socrata baseline).
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

**Tabled — possible enhancement:** period/decade comparison *inside* a
Sex/Race breakdown. Blocked today because the ranked bar chart has one
color axis and the breakdown already spends it on the subgroup. Paths if
revisited: (a) a **single-cause** mode — bars grouped subgroup × decade
(~8 bars, readable); (b) a different chart type (small multiples, or
slope/dumbbell per subgroup). The trend chart already covers
subgroup-over-time for one cause. Don't try to cram top-15 × subgroups ×
decades onto one bar chart.

**Still needs WONDER params (no skeleton — iterate against live WONDER):**

1. **D176 per-cause for 2021+** — the `provisional` era is Year-only; a
   real per-cause breakdown needs D176's "ICD-10 113 Cause List" variable
   (NOT `V4` = "15 Leading Causes"). `V25` (label "All Causes of Death",
   codeset finder) is the likely candidate — one `--dump` to confirm,
   then add `B_2` and widen the era's column contract back to 6.
2. **`natality_current.xml` (D192)** — births past 2022 with a fertility
   rate. **Five attempts have 400'd** (D149 skeleton sub, D66 skeleton sub,
   bare-bones, `stage=about`, D149 skeleton + `O_PR`). The last returns a
   *bare* "Processing Error" with no `<message>` — WONDER can't parse the
   request for D192 at all, i.e. its variable numbering differs from D149's
   and isn't in any skeleton. Dead end without the real param set captured
   from the D192 form on wonder.cdc.gov. **Interim (working):**
   `src/api/natality.js` rolls up Socrata `hmz2-vwda` monthly births into
   an annual total for the latest *complete* calendar year (2023 now),
   flagged provisional — self-extends as CDC updates that table. D192 only
   adds the rate for those years. The committed `natality_current.xml` is
   the D149+O_PR draft, left as a starting point; the `current` era's
   column contract is trimmed to `[year, birth_count]` to match it.
3. **D16 + D15** — pre-1999 mortality; lights up the disabled decade
   buttons. Also needs an ICD-8/9 → ICD-10 cause crosswalk (different
   cause taxonomy), so it's the biggest lift.
4. Schedule the pipeline (host + cron + publish, `pipeline/README.md`)
   once an *updating* dataset (D192 natality, or D176 provisional) is in.
5. Periodically re-check `hmz2-vwda`'s data currency (see ⚠️ above).

WONDER API rate limit: ≥15 s between requests (429 otherwise); a manual
loop needs `sleep 16` between `fetch.js` calls.
