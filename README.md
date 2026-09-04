# Why We Die — whywedie.org

An interactive site tracking US death, birth, and population statistics,
sourced from CDC data.

**Current state:** all six sidebar sections are live.

| section | data | notes |
|---|---|---|
| Home | — | project overview + "pick a year" cross-section lookup |
| Death Statistics Over Time | CDC WONDER → `/data/mortality.json`, `/data/mortality_monthly.json` | annual all-cause deaths **1968–present** (D74/D16/D76/D176) with a Total-deaths / Age-adjusted-rate toggle (the rate spliced to **1900** from Socrata `w9j2-ggv5`) + monthly all-cause deaths (D176, 2018–present), each with time-range tabs |
| Causes of Death | CDC WONDER via [`pipeline/`](pipeline/) → `/data/mortality.json` | ranked bars + trend; overlay multiple periods (years or decade ranges) and causes; friendly ↔ official cause names; per-cause 1999–2025 (113 list), ICD-chapter grain **1968–2025** ("Broad Chapters"); optional Sex / Race breakdown **1999–2025** (`/data/mortality_demographic.json`) |
| Birth Statistics | CDC WONDER + Socrata | annual births 1960–present + fertility/birth-rate toggle (`/data/natality.json`), Pew generation bands with drill-down, `(i)` field explainer; monthly births (D192 `/data/natality_monthly.json`, Socrata fallback) |
| Population Decline / Gain | CDC WONDER + Socrata | births vs. deaths + the shrinking natural increase (**1968–2025**), century-long birth history |
| By the Numbers | Socrata + public estimates | births/deaths as a daily average + rotating scale-comparison facts |

## Tech stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** — dev server & build tool
- **Vue Router 4** — client-side routing
- **Tailwind CSS v4** — utility-first styling, zero-config content detection
  via the `@tailwindcss/vite` plugin
- **Chart.js + vue-chartjs** — all charts

**The site itself is static** — no server, no build-time data fetch. It
either calls data.cdc.gov's Socrata JSON API directly from the browser, or
reads a committed JSON snapshot (`/data/mortality.json`, `/data/natality.json`).
Those snapshots are produced out-of-band by the Node pipeline in
[`pipeline/`](pipeline/), which runs on its own schedule against CDC WONDER
and is completely separate from the frontend (its own `package.json`, never
imported by the app). See [`pipeline/README.md`](pipeline/README.md).

`package.json` pins dependencies to their current major versions with `^`
ranges, so `npm install` will pull the latest compatible release.

## Getting started (local dev)

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build      # production build → dist/
npm run preview    # locally preview the production build
```

## How the data pipelines work

Most of the data comes from **committed JSON snapshots** in `public/data/`,
built out-of-band from CDC WONDER by [`pipeline/`](pipeline/):
`mortality.json` (all-cause + per-cause deaths + ICD chapters, 1968–present),
`mortality_demographic.json` (deaths by sex / race, 1999–2025),
`mortality_monthly.json` (all-cause deaths by month), `natality.json`
(births + fertility rate, 1960–present), `natality_monthly.json` (births by
month, D192). The frontend just `fetch()`es them.

The **data.cdc.gov Socrata (SODA) API** — plain JSON GET + CORS, called
straight from the browser via `src/api/socrata.js`, no backend — now backs
the pre-1960 birth history (`e6fc-ccez`), the pre-1968 age-adjusted death
rate (`w9j2-ggv5`, plus `489q-934x` as a fallback), and is the
**fallback** for the monthly-births and By-the-Numbers charts when a
WONDER snapshot is still a stub (`hmz2-vwda`). Every Socrata query below
was tested against the live API, and each module has comments on the
quirks found doing that.

### 1. Monthly births

**Module:** `src/api/monthlyBirths.js` — reads `/data/natality_monthly.json`
(CDC WONDER D192 "Provisional Natality", grouped by year × month, Jan 2023
onward). If that file is an empty stub it falls back to Socrata `hmz2-vwda`
(`indicator='Number of Live Births'`) via `currentVitalEvents.js`.

⚠️ `hmz2-vwda` **is not continuously current** — CDC trimmed it to a rolling
window and stopped refreshing it past June 2024. That's why the D192 era
exists (monthly *deaths* moved off `hmz2-vwda` for the same reason). The
stat card and YoY key off the latest *complete* month; the still-filling
tail renders dashed.

### 2. Annual deaths

**Module:** `src/api/historicalDeaths.js` — reads the `"All causes"` rows
out of `/data/mortality.json` into one continuous national series with
crude and age-adjusted rate: **1968–1978** (D74) + **1979–1998** (D16),
both ICD-chapter-grouped year-only totals; **1999–2020** (D76); **2021+**
(D176 provisional, flagged dashed + grey). The Death Statistics chart has
a Total-deaths / Age-adjusted-rate toggle; on the rate, the series is
spliced back to **1900** from Socrata `w9j2-ggv5` (2000-standard, matches
WONDER at the 1968 seam) — counts have no pre-1968 source. Socrata
`489q-934x` (VSRR) is wired as a rate fallback for any year the snapshot
lacks. The source label names only the databases that actually
contributed years.

### 3. Leading causes of death (CDC WONDER, not Socrata)

**Source:** CDC WONDER — "Underlying Cause of Death" `D76` (1999–2020) +
"Provisional Mortality" `D176` (2021–present) at the NCHS 113 Selected
Causes list, plus "Compressed Mortality" `D16`/`D74` at ICD-chapter grain
for 1979–1998 / 1968–1978. National, grouped by year × cause.
**Frontend module:** `src/api/causesOfDeath.js` — fetches the static
snapshot `/data/mortality.json` (same-origin file, no API call, no CORS).
**Producer:** [`pipeline/`](pipeline/) — a Node job that POSTs XML to the
WONDER API, parses the response, upserts to a MySQL database, and emits the
JSON snapshot. Runs off-box (cPanel has no Node runtime); see
[`pipeline/README.md`](pipeline/README.md).

The snapshot carries deaths, population, crude rate and age-adjusted rate
per cause per year. `causesOfDeath.js` exposes only the NCHS *rankable*
("#"-prefixed) causes — the 113 list also contains roll-up super-categories
and sub-detail that would double-count in a ranking, and the pre-1999
chapter rows are non-`#` so the ranked view ignores them — and aligns each
cause's series to the full year axis so several can be overlaid. The
ranked/trend UI covers **1999–2025**; a separate **"Broad Chapters"**
section shows the ICD-chapter data (D74/D16/D76/D176) as a multi-line
trend **1968–2025**, with ICD-8/9/10 labels unified via a small crosswalk
in `causesOfDeath.js` (seams at 1979 and 1999; ICD-10's split-out eye/ear
chapters folded back into "Nervous system & sense organs"; COVID-19's
U07.1 shows as a "Special-purpose codes" line from 2020).

⚠️ **The WONDER API is national-only for vital statistics** — it refuses any
State / County / Region grouping or filter. Every row is US-wide.
`/data/mortality.json` is committed as a baseline so the site works on a
fresh deploy; the pipeline's publish step overwrites it in production.

### 4. Birth statistics

`BirthStatisticsView.vue` has two series:
- **Annual births + fertility/birth rate** — `src/api/natality.js` reads
  `/data/natality.json`. Pre-2003 is the committed Socrata `89yk-m38d`
  baseline (NCHS Natality Measures by Race, "All races": births, crude
  birth rate, general fertility rate); 2003–2022 comes from the WONDER
  natality pipeline (D27 for 2003–2006, D66 for 2007–2022) and 2023–present
  from D192 ("Provisional Natality") — `build-snapshots.js` merges them over
  the baseline. D192 has **no rate measure**; `natality.js` backfills the
  crude birth rate for 2019+ from births ÷ the resident-population figure in
  `mortality.json` (flagged `birthRateDerived`), so that toggle runs to
  2025. The general fertility rate runs to **2023**: WONDER supplies it
  through 2020, and [`pipeline/fetch-census-fertility.js`](pipeline/fetch-census-fertility.js)
  backfills the rest from the Census Bureau's Population Estimates Program
  (women aged 15–44, national) — not a WONDER dataset, needs a free
  `CENSUS_API_KEY`. It only fills years that have a birth count but no
  rate yet, so it never overwrites WONDER's own figures, and re-running it
  is a no-op until Census publishes a newer vintage (currently 2023 is the
  newest with an age/sex breakdown). Those years render dashed/grey — a
  different source than WONDER's own published rate. A partial trailing
  calendar year is dropped from the plotted
  line and shown as a caption. The Births view carries the Pew Research
  generation cohorts as clickable, drill-downable bands.
- **Monthly births** — `src/api/monthlyBirths.js` (see §1), plus a rough
  year-over-year off the latest complete month.

### 5. Population change (births vs. deaths)

`src/api/populationChange.js` reads births from `/data/natality.json` (via
`natality.js`, so it inherits the D192 provisional years) and deaths from
`/data/mortality.json` `"All causes"`. `fetchBirthsVsDeaths()` returns the
births/deaths overlap (currently ~1968–2025) with natural increase;
`fetchBirthHistory()` prepends the Socrata `e6fc-ccez` series for the
pre-1960 birth history (the long view runs 1909–present, with Pew
generation bands + drill-down). Deaths 2021+ and any partial trailing
birth year are flagged provisional.

### 6. By the Numbers (daily pace)

`src/api/dailyStats.js` sums the last 12 months that both
`/data/mortality_monthly.json` (D176) and `/data/natality_monthly.json`
(D192) cover — dropping a clearly-incomplete trailing month — and divides
by 365 for a "typical day" figure. It falls back to the Socrata rolling
table (`hmz2-vwda`, `period='12 Month-ending'`) only if either snapshot is
still a stub. `src/data/dailyFacts.js` is a small hand-curated list of
rough public "N per year" estimates (pizzas, coffee, lightning, …) shown
as annual ÷ 365 for scale, clearly labelled as estimates.

### Socrata vs. CDC WONDER

Two data strategies coexist on purpose:

- **Socrata** (`data.cdc.gov`) — plain JSON + CORS, browser-direct, no
  infrastructure. Downside: CDC trims and stalls the datasets. Now only the
  pre-1960 birth history (`e6fc-ccez`), the pre-1968 age-adjusted death
  rate (`w9j2-ggv5`) and its VSRR fallback (`489q-934x`), and a `hmz2-vwda`
  fallback for the monthly-births and By-the-Numbers charts when a WONDER
  snapshot is still a stub.
- **CDC WONDER** — XML/POST, no CORS, national-only. Needs the out-of-band
  [`pipeline/`](pipeline/) (an earlier version was an always-on Node proxy;
  that's gone — it's a scheduled batch job that writes static files).
  Upside: finalized multi-decade data with age-adjusted rates. Powers
  everything else.

## Deploying to GoDaddy

The site is static files in `public_html`:

1. `npm run build` locally — produces `dist/` (including `.htaccess` and
   `data/mortality.json`, both copied from `public/`).
2. Upload the **contents** of `dist/` (not the `dist` folder itself) into
   `public_html`, via cPanel File Manager or FTP. Overwrite `index.html`
   and `assets/`.
3. **After a File Manager zip-extract, fix permissions:** `public_html`
   itself must be `755`, and every file `644` (folders `755`). The extract
   can leave `.htaccess` as `600`, which Apache can't read → the whole site
   403s. This has bitten the site more than once.
4. `public/.htaccess` folds two rules into one `mod_rewrite` block: force
   HTTPS, and the Vue Router history-mode fallback (so a direct link /
   refresh on `/causes-of-death` doesn't 404). Keep them together.

`data/mortality.json` in the build is a baseline; once the pipeline is
scheduled its publish step (FTP upload into `public_html/data/`) keeps that
file fresh independently of site deploys. The pipeline itself does **not**
run on cPanel — see [`pipeline/README.md`](pipeline/README.md).

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
    socrata.js                # generic data.cdc.gov Socrata client
    currentVitalEvents.js     # Socrata hmz2-vwda monthly births (fallback for monthlyBirths.js)
    monthlyBirths.js          # monthly births from /data/natality_monthly.json (D192), Socrata fallback
    monthlyDeaths.js          # monthly all-cause deaths from /data/mortality_monthly.json
    historicalDeaths.js       # annual all-cause deaths from /data/mortality.json (1968-present)
    causesOfDeath.js          # reads /data/mortality.json (from pipeline/), reshapes for the view
    causeBreakdown.js         # reads /data/mortality_demographic.json — Sex/Race breakdown
    populationChange.js       # births (natality.json) vs deaths (mortality.json) + natural increase
    dailyStats.js             # 12-month sum of the monthly WONDER snapshots ÷ 365 (hmz2-vwda fallback)
    yearFacts.js              # per-year births/deaths/leading-cause for the Home "pick a year" panel
    natality.js               # annual births + fertility rate from /data/natality.json
  lib/
    csv.js                    # toCsv / downloadCsv helpers
  composables/
    useAsyncData.js           # shared loading/error/data helper for section views
    useNamePreference.js      # friendly vs official cause names, persisted (localStorage)
  components/
    AppSidebar.vue            # sidebar nav (desktop: static, mobile: slide-in drawer)
    NavIcon.vue                # inline SVG icons per section
    PageHeader.vue             # consistent page title/description header
    YearLookup.vue             # Home "in the year N" cross-section lookup
    RangeTabs.vue              # segmented control for a chart's time window
    TimeSeriesChart.vue        # Chart.js line chart, single- or multi-series (Death Stats + trend)
    RankedBarChart.vue         # Chart.js horizontal bar chart, single- or multi-series (period compare)
    ChartToolbar.vue           # Table / CSV / Copy-link row under a chart
    DataTable.vue              # sortable table of a chart's underlying rows
  views/
    HomeView.vue               # project overview (built out)
    DeathStatisticsView.vue    # annual chart + monthly chart, each with its own caveats
    CausesOfDeathView.vue      # ranked bars (compare periods) + trend (compare causes)
    BirthStatisticsView.vue    # provisional monthly births + YoY
    PopulationChangeView.vue   # births vs deaths, natural increase, century birth history
    ByTheNumbersView.vue       # births/deaths as a daily average + rotating scale facts
public/
  .htaccess                   # Apache: HTTPS redirect + Vue Router history-mode fallback
  data/                       # committed snapshots; pipeline/ refreshes them in prod
    mortality.json            #   all-cause + per-cause deaths + ICD chapters, 1968-present
    mortality_demographic.json #  deaths by sex / race, 1999-2025
    mortality_monthly.json    #   all-cause deaths by month, 2018-present
    natality.json             #   births + fertility rate, 1960-present
    natality_monthly.json     #   births by month, D192, 2023-present
pipeline/                     # standalone Node job: CDC WONDER -> MySQL -> /data/*.json
                              #   (own package.json; see pipeline/README.md)
```

Adding a sidebar section: add an entry to `nav.js`, a view file, an icon
branch in `NavIcon.vue`, and a line in the `viewComponents` map in
`router/index.js`. Adding a new live-data section: add a `src/api/*.js`
module — a snapshot reader (`causesOfDeath.js`) or a Socrata query
(`currentVitalEvents.js`; always test the query against the live API
before assuming a dataset's fields/quirks — see "How the data pipelines
work" above), and a view using `useAsyncData` + a chart component the way
`DeathStatisticsView.vue` does.

## Design system

The **chrome** (sidebar, headers, buttons, cards, stat numbers, body copy)
is strictly black, white, and gray. Tokens live in `src/style.css` under
`@theme` (`--color-ink`, `--color-paper`, `--color-line`, `--color-muted`,
etc.), and reusable component classes (`.btn-primary`, `.btn-secondary`,
`.card`, `.badge`, `.link-underline`) keep buttons and links consistent —
rounded corners, subtle shadows, hover/active states, and visible focus
rings throughout (nothing removes `:focus-visible`). Custom reusable pieces
that other classes compose via `@apply` (like `.btn`) are declared with
Tailwind v4's `@utility` at-rule. Font is Inter, from Google Fonts, with a
system-font fallback.

**Chart marks are the exception** — bars and lines use a small validated
color palette (`src/charts/palette.js`) so multiple series and
period-vs-period comparisons stay legible. Axis / grid / tooltip / all text
stay in the gray tokens; a legend is always shown for 2+ series and line
series also carry a dash pattern (identity never rests on color alone).

The sidebar is a fixed dark panel on desktop (≥1024px) and an off-canvas
drawer on mobile, toggled from a top bar.

## What's next

**Done + deployed:** D76 causes (1999–2020) + D176 provisional all-cause
and per-cause (2021–2025); D176 monthly deaths; D74/D16/D76/D176 ICD
chapter mortality **1968–2025** ("Broad Chapters"); D74/D16 all-cause
year-only totals; the age-adjusted death rate spliced to **1900**
(`w9j2-ggv5`); D27/D66 natality (1960–2022) + D192 provisional births
(annual + monthly); Sex/Race breakdown **1999–2025**; Pew generation
bands + drill-down on the births charts and the Home year lookup;
By-the-Numbers off the monthly WONDER snapshots.

**Done, committed, not yet deployed:** general fertility rate extended to
**2023** via `pipeline/fetch-census-fertility.js` (Census PEP women-15–44
population, not a WONDER dataset — needs `CENSUS_API_KEY`). Run
`./deploy.sh` to publish.

- [ ] Stand the pipeline up on a schedule (host + cron + publish, see
      `pipeline/README.md`) — only the D176/D192 provisional eras recur
      (pass `--years=2021-<last full year>`); the finalized databases run
      once.
- [ ] **Future effort:** a 113-list-equivalent ICD-9/8 cause breakdown
      (finer than the chapter grain) — needs the NCHS comparability-ratio
      crosswalk applied per cause.
- [ ] Periodically re-check whether `hmz2-vwda` has resumed updating
      (still ends June 2024 as of 2026-09).
