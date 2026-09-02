# Why We Die — whywedie.org

An interactive site tracking US death, birth, and population statistics,
sourced from CDC data.

**Current state:** all six sidebar sections are live.

| section | data | notes |
|---|---|---|
| Home | — | project overview |
| Death Statistics Over Time | Socrata | annual rollup + current monthly |
| Causes of Death | CDC WONDER via [`pipeline/`](pipeline/) → `/data/mortality.json` | overlay multiple periods (years or decade ranges) and multiple causes; friendly ↔ official cause names; optional Sex / Race breakdown (`/data/mortality_demographic.json`, hidden until the pipeline eras run) |
| Birth Statistics | Socrata + CDC WONDER | annual births + fertility rate (`/data/natality.json`, 1960–2022; latest complete year rolled up from monthly counts) + provisional monthly births (Socrata) |
| Population Decline / Gain | Socrata | births vs. deaths + natural increase (1999–2017), century-long birth history |
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

Most of the data now comes from **committed JSON snapshots** in
`public/data/`, built out-of-band from CDC WONDER by
[`pipeline/`](pipeline/) — `mortality.json` (all-cause + per-cause deaths),
`mortality_demographic.json` (deaths by sex / race), `mortality_monthly.json`
(all-cause deaths by month), `natality.json` (births + fertility rate). The
frontend just `fetch()`es them.

The **data.cdc.gov Socrata (SODA) API** — plain JSON GET + CORS, called
straight from the browser via `src/api/socrata.js`, no backend — is still
the source for the current monthly **births** chart (`hmz2-vwda`), the
By-the-Numbers daily pace (`hmz2-vwda` 12-month-ending), and the pre-1960
birth history / latest-year births roll-up (`e6fc-ccez` + `hmz2-vwda`).
Every Socrata query below was tested against the live API, and each module
has comments on the quirks found doing that.

### 1. Current monthly births

**Dataset:** `hmz2-vwda` — "AH Monthly Provisional Counts of Live Births,
Deaths, and Other Vital Events" ([data.cdc.gov/d/hmz2-vwda](https://data.cdc.gov/d/hmz2-vwda))
**Module:** `src/api/currentVitalEvents.js`

```
GET https://data.cdc.gov/resource/hmz2-vwda.json
    ?$where=state='UNITED STATES' AND period='Monthly' AND indicator='Number of Live Births'
    &$order=year, month
```

⚠️ **This dataset is not continuously current.** CDC trimmed it to a
rolling ~18-month window and hadn't refreshed it past June 2024 at time of
writing. It's still the most current source CDC publishes for monthly
births; the chart shows the actual latest date. Monthly *deaths* moved off
this dataset to the WONDER `mortality_monthly.json` for the same reason.

### 2. Annual deaths

**Module:** `src/api/historicalDeaths.js` — reads the `"All causes"` rows
out of `/data/mortality.json` (D76 1999–2020 + D176 provisional 2021+), so
the annual chart is one continuous national series with crude and
age-adjusted rate. 2021+ points are flagged provisional (dashed + grey).
(This module used to roll up the Socrata weekly-deaths dataset `muzy-jte6`,
which only started in 2020.)

### 3. Leading causes of death (CDC WONDER, not Socrata)

**Source:** CDC WONDER "Underlying Cause of Death, 1999–2020" (database
`D76`), national, grouped by year × the NCHS 113 Selected Causes list.
**Frontend module:** `src/api/causesOfDeath.js` — fetches the static
snapshot `/data/mortality.json` (same-origin file, no API call, no CORS).
**Producer:** [`pipeline/`](pipeline/) — a Node job that POSTs XML to the
WONDER API, parses the response, upserts to a MySQL database, and emits the
JSON snapshot. Runs off-box (cPanel has no Node runtime); see
[`pipeline/README.md`](pipeline/README.md).

The snapshot carries deaths, population, crude rate and age-adjusted rate
per cause per year. `causesOfDeath.js` exposes only the NCHS *rankable*
("#"-prefixed) causes — the 113 list also contains roll-up super-categories
and sub-detail that would double-count in a ranking — and aligns each
cause's series to the full year axis so several can be overlaid.

⚠️ Worth knowing:
- **The WONDER API is national-only for vital statistics** — it refuses any
  State / County / Region grouping or filter. Every row is US-wide.
- `/data/mortality.json` is committed as a baseline so the site works on a
  fresh deploy; the pipeline's publish step overwrites it in production.
- Per-cause coverage is **1999–2020** (D76's range). 2021+ is wired only as
  an all-cause total (D176); a per-cause 2021+ breakdown and the pre-1999
  ICD-9/ICD-8 decades still need more WONDER databases — the decade buttons
  for those are disabled in the UI.

### 4. Birth statistics

`BirthStatisticsView.vue` has two series:
- **Annual births + fertility rate** — `src/api/natality.js` reads
  `/data/natality.json`. Pre-2003 is the committed Socrata `89yk-m38d`
  baseline (NCHS Natality Measures by Race, "All races": births, crude
  birth rate, general fertility rate); 2003–2022 comes from the WONDER
  natality pipeline (D27 for 2003–2006, D66 for 2007–2022 — see
  `pipeline/`), which `build-snapshots.js` merges over the baseline.
  `natality.js` then rolls up CDC's monthly counts (`hmz2-vwda`) into an
  annual total for the latest complete year (2023), flagged provisional,
  since D192 ("Provisional Natality, 2023 through Last Month") won't take
  an API request — see `pipeline/templates/README.md`.
- **Provisional monthly births** — `fetchCurrentMonthlyBirths()` in
  `src/api/currentVitalEvents.js` (`hmz2-vwda`, `indicator='Number of Live
  Births'`), plus a rough year-over-year.

### 5. Population change (births vs. deaths)

`src/api/populationChange.js` reads births from `/data/natality.json` (via
`natality.js`, so it inherits the latest-year monthly roll-up) and deaths
from `/data/mortality.json` `"All causes"`. `fetchBirthsVsDeaths()` returns
the 1999–2022 overlap with natural increase; `fetchBirthHistory()` prepends
the Socrata `e6fc-ccez` series for pre-1960 birth history. Deaths 2021+ are
flagged provisional.

### 6. By the Numbers (daily pace)

`src/api/dailyStats.js` reads `hmz2-vwda`'s `period='12 Month-ending'` rows
(most recent month with both births and deaths, ÷ 365) for a "typical day"
figure — more current than the annual files (reaches ~mid-2024).
`src/data/dailyFacts.js` is a small hand-curated list of rough public "N per
year" estimates (pizzas, coffee, lightning, …) shown as annual ÷ 365 for
scale, clearly labelled as estimates.

### Socrata vs. CDC WONDER

Two data strategies coexist on purpose:

- **Socrata** (`data.cdc.gov`) — plain JSON + CORS, browser-direct, no
  infrastructure. Downside: CDC trims and stalls the datasets. Now only
  the monthly-births chart, the By-the-Numbers daily pace, and the pre-1960
  birth history.
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
    causeNames.js             # friendly labels for the 49 rankable causes
    dailyFacts.js             # rough "N per year" scale facts for By the Numbers
  api/
    socrata.js                # generic data.cdc.gov Socrata client
    currentVitalEvents.js     # current monthly births (Socrata hmz2-vwda)
    monthlyDeaths.js          # monthly all-cause deaths from /data/mortality_monthly.json
    historicalDeaths.js       # annual all-cause deaths from /data/mortality.json
    causesOfDeath.js          # reads /data/mortality.json (from pipeline/), reshapes for the view
    causeBreakdown.js         # reads /data/mortality_demographic.json — Sex/Race breakdown
    populationChange.js       # births (natality.json) vs deaths (mortality.json) + natural increase
    dailyStats.js             # hmz2-vwda 12-month-ending births/deaths, for the daily average
    yearFacts.js              # per-year births/deaths/leading-cause for the Home "pick a year" panel
    natality.js               # annual births + fertility rate from /data/natality.json (+ monthly roll-up)
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
    mortality.json            #   all-cause + per-cause deaths, 1999-present
    mortality_demographic.json #  deaths by sex / race, 1999-2020
    mortality_monthly.json    #   all-cause deaths by month, 2018-present
    natality.json             #   births + fertility rate, 1960-2022
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

- [x] **D76 (Causes of Death)** — run + committed. `/data/mortality.json`
      is real WONDER output, national, 1999–2020. Finalized — no schedule
      needed.
- [x] **Natality D66 + D27** — run + committed. `/data/natality.json` is
      1960–2022 (pre-2003 Socrata baseline, 2003–2006 D27, 2007–2022 D66).
- [ ] **`natality_current.xml` (D192)** — "Provisional Natality, 2023
      through Last Month", updated monthly. Placeholder; needs its API
      parameter set from WONDER (its "expanded" param names differ from
      D66/D27). This is the piece that gets births to the current month.
- [ ] **Causes of Death Sex / Race breakdown** — templates
      `mortality_icd10_sex.xml` / `_race.xml` (D76 × V7 / V8) and eras
      `icd10_sex` / `icd10_race` writing the `mortality_demographic` table
      are built; needs one `--dump` confirm run each, then a pipeline run.
      The Breakdown control on the page is wired and hidden until the
      snapshot has real data.
- [ ] **Recent-years mortality (2021+)** — `mortality_provisional.xml` /
      D176 era `provisional` is built (Year-only all-cause totals; D176's
      cause list won't combine with Year). Needs a confirm run.
- [ ] D16 (ICD-9) + D15 (ICD-8) for pre-1999 mortality — lights up the
      disabled decade buttons on Causes of Death. No skeleton — needs its
      params from WONDER.
- [ ] Stand the pipeline up on a schedule (host + cron + publish, see
      `pipeline/README.md`) once D192 natality is in — the finalized
      datasets don't need it.
- [ ] Periodically re-check whether `hmz2-vwda` has resumed updating past
      June 2024, or whether CDC has published a replacement dataset.
