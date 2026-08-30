# Why We Die — whywedie.org

An interactive site tracking US death, birth, and population statistics,
sourced live from CDC's open data platform (data.cdc.gov).

**Current state:** full sidebar shell, Home page, and a live **Death
Statistics Over Time** page (two charts — see below). Causes of Death,
Birth Statistics, and Population Decline/Gain are still "coming soon"
placeholders.

## Tech stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** — dev server & build tool
- **Vue Router 4** — client-side routing
- **Tailwind CSS v4** — utility-first styling, zero-config content detection
  via the `@tailwindcss/vite` plugin
- **Chart.js + vue-chartjs** — the Death Statistics charts

That's it — **no backend.** The site calls data.cdc.gov's Socrata JSON API
directly from the browser (see "How the data pipelines work" below), so
this is a fully static site.

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

Everything goes through data.cdc.gov's **Socrata (SODA) API** — plain JSON
over HTTP GET, with CORS support, so the browser calls it directly with no
backend proxy. See `src/api/socrata.js` for the shared client and
`src/api/*.js` for each pipeline. Every query below was tested against the
live API while building this (not just written from docs), and each module
has comments on the quirks that were found doing that.

### 1. Current monthly births / deaths

**Dataset:** `hmz2-vwda` — "AH Monthly Provisional Counts of Live Births,
Deaths, and Other Vital Events" ([data.cdc.gov/d/hmz2-vwda](https://data.cdc.gov/d/hmz2-vwda))
**Module:** `src/api/currentVitalEvents.js`

```
GET https://data.cdc.gov/resource/hmz2-vwda.json
    ?$where=state='UNITED STATES' AND period='Monthly' AND indicator='Number of Deaths'
    &$order=year, month
```
(swap `indicator` for `'Number of Live Births'` for births)

⚠️ **This dataset is not continuously current.** Its most recent record as
of building this was **June 2024** — despite being CDC's "current
provisional" table, on a nominally quarterly update schedule, it hadn't
been refreshed in over a year at time of writing. It's still the most
current source CDC publishes for this figure; the site shows the actual
latest available date rather than assuming it means "now." Worth
periodically re-checking whether CDC has resumed updating it, or whether
they've replaced it with a new dataset ID.

### 2. Historical annual death rollup

**Dataset:** `muzy-jte6` — "Weekly Counts of Deaths by Jurisdiction and
Select Causes of Death" ([data.cdc.gov/d/muzy-jte6](https://data.cdc.gov/d/muzy-jte6))
**Module:** `src/api/historicalDeaths.js`

The raw data is weekly, per jurisdiction. A server-side SoQL rollup sums it
to annual national totals instead of downloading and summing weekly rows
client-side:

```
GET https://data.cdc.gov/resource/muzy-jte6.json
    ?$select=mmwryear as year, sum(all_cause) as total_annual_deaths, count(*) as week_count
    &$where=jurisdiction_of_occurrence='United States'
    &$group=mmwryear
    &$order=mmwryear
```

⚠️ Two things that aren't obvious and matter a lot here:
- `jurisdiction_of_occurrence='United States'` is required in `$where` —
  the dataset has a row per state *and* a national total row each week; without
  the filter, the sum adds every state on top of the national total.
- **The most recent year is a partial year.** At time of writing, 2023 data
  only covers 37 of ~52 weeks. Summed naively next to full years, it reads
  as a sharp (fake) decline. `count(*) as week_count` is fetched alongside
  the sum specifically so the UI can flag any year under ~52 weeks rather
  than show a misleading total — see the muted point + caption on the
  annual chart in `DeathStatisticsView.vue`.

### 3. Birth statistics (pipeline implemented, page not built yet)

Same dataset as #1 (`hmz2-vwda`), `indicator='Number of Live Births'`.
`fetchCurrentMonthlyBirths()` in `src/api/currentVitalEvents.js` is ready
to use — `BirthStatisticsView.vue` just hasn't been built out yet (still a
placeholder).

### Scope note vs. the original CDC WONDER approach

This site originally used the CDC WONDER API (1999–2020 finalized data via
a Node proxy, since WONDER requires XML/POST and has no CORS support).
That's been fully removed in favor of these Socrata pipelines, which are
simpler (no backend, plain JSON, CORS-friendly) but cover a **much shorter
time range** (2020–present, not 1999–present) and **no age-adjusted rate**
— only raw counts. That's a real tradeoff, not just an implementation
detail; if multi-decade trend charts matter later, a finalized-data source
covering more years (CDC WONDER, or something else) may still be worth
adding back for the historical end specifically, run alongside these
Socrata pipelines for the current end. Not done in this pass — flagging it
so the tradeoff is a deliberate choice, not a silent regression.

## Deploying to GoDaddy

Since there's no backend anymore, deployment is simpler than before — the
whole site is static files:

1. `npm run build` locally — produces `dist/`.
2. Upload the **contents** of `dist/` (not the `dist` folder itself) into
   `public_html`, via cPanel File Manager or FTP.
3. `public/.htaccess` is already in this project and gets copied into
   `dist/` automatically on build — it's required for Vue Router's
   client-side routing to survive a direct link or a page refresh on a
   route like `/death-statistics` (otherwise Apache 404s).

(No Node app / cPanel "Setup Node.js App" needed anymore — that was only
for the now-removed CDC WONDER proxy.)

## Project structure

```
src/
  nav.js                     # single source of truth for the 5 sidebar sections
  router/index.js            # routes generated from nav.js
  App.vue                    # app shell: sidebar + mobile top bar + page transitions
  style.css                  # Tailwind import, black/white design tokens, component classes
  api/
    socrata.js                # generic data.cdc.gov Socrata client
    currentVitalEvents.js     # pipeline 1 & 3: current monthly deaths + births (hmz2-vwda)
    historicalDeaths.js       # pipeline 2: historical annual death rollup (muzy-jte6)
  composables/
    useAsyncData.js           # shared loading/error/data helper for section views
  components/
    AppSidebar.vue            # sidebar nav (desktop: static, mobile: slide-in drawer)
    NavIcon.vue                # inline SVG icons per section
    PageHeader.vue             # consistent page title/description header
    ComingSoonPanel.vue        # placeholder panel used by the 3 unbuilt sections
    TimeSeriesChart.vue        # Chart.js line chart, reused for both Death Statistics charts
  views/
    HomeView.vue               # project overview (built out)
    DeathStatisticsView.vue    # live: annual chart + monthly chart, each with its own caveats
    CausesOfDeathView.vue      # placeholder
    BirthStatisticsView.vue    # placeholder
    PopulationChangeView.vue   # placeholder
public/
  .htaccess                   # Apache rewrite for Vue Router history mode (copied into dist/ on build)
```

Adding a 6th sidebar section: add an entry to `nav.js`, add a view file, add
it to the `viewComponents` map in `router/index.js`. Adding a new live-data
section: add a `src/api/*.js` module following the pattern in
`historicalDeaths.js` / `currentVitalEvents.js` (always test the actual
query against the live API before assuming a dataset's fields/quirks — see
"How the data pipelines work" above for why that matters), and a view using
`useAsyncData` + `TimeSeriesChart` the way `DeathStatisticsView.vue` does.

## Design system

Strictly black, white, and gray — no color anywhere. Tokens live in
`src/style.css` under `@theme` (`--color-ink`, `--color-paper`,
`--color-line`, `--color-muted`, etc.), and reusable component classes
(`.btn-primary`, `.btn-secondary`, `.card`, `.badge`, `.link-underline`) keep
buttons and links consistent across pages — rounded corners, subtle shadows,
hover/active states, and visible focus rings throughout (nothing removes
`:focus-visible`, so the site stays keyboard-accessible). Custom reusable
pieces that other classes compose via `@apply` (like `.btn`) are declared
with Tailwind v4's `@utility` at-rule rather than a plain class — plain
classes in `@layer components` can't be `@apply`'d by other classes in v4.
Font is Inter, loaded from Google Fonts with a system-font fallback.

The sidebar is a fixed dark panel on desktop (≥1024px) and an off-canvas
drawer on mobile, toggled from a top bar.

## What's next

- [ ] Causes of Death — pick a data.cdc.gov dataset for cause breakdowns,
      build following the same pattern
- [ ] Birth Statistics page — the data pipeline already exists
      (`fetchCurrentMonthlyBirths`), just needs a view
- [ ] Population Decline/Gain — combine the births and deaths pipelines
- [ ] Decide whether to reintroduce a finalized, longer-history data source
      for multi-decade trend views (see "Scope note" above)
- [ ] Periodically re-check whether `hmz2-vwda` has resumed updating past
      June 2024, or whether CDC has published a replacement dataset
