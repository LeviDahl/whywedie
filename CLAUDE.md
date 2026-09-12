# CLAUDE.md — Why We Die (whywedie.org)

Interactive site tracking US death, birth, and population statistics,
sourced live from CDC's open data platform (data.cdc.gov). Open site, no
authentication.

## Current state

All seven sidebar sections are live (Home, Death Statistics Over Time,
Causes of Death, Birth Statistics, Population Decline/Gain, By the Numbers,
Injury Deaths).

- **Death Statistics** — five sections: annual all-cause deaths
  **1968–present** (WONDER D74/D16→D76→D176) with a counts/age-adjusted-rate
  toggle (rate to 1900); current-monthly deaths (D176); **Life Expectancy
  at Birth 1900–present** (`src/api/lifeExpectancy.js`, Socrata `w9j2-ggv5`
  + NCHS-final 2019–2023 supplement); **seasonality** ("When in the Year
  People Die" — mean deaths by calendar month, length-adjusted); **Deaths
  by Age** (`src/api/deathsByAge.js`, Socrata `y5bj-9g5w` rollup, 2015–2022).
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
- **By the Numbers** — Worldometers-style **live projected counters**
  (`LiveCounters.vue` + `LiveNumber.vue` + `src/composables/useClock.js`,
  one 4 Hz interval): "so far today / so far this year" for births/deaths,
  and the rotating scale facts (`src/data/dailyFacts.js`) tick too, big
  numbers abbreviated ("5.9 billion"). Plus **"In one lifetime"**
  (`LifetimeTally.vue` — births/deaths since a chosen year) and the daily
  average (`src/api/dailyStats.js`, `hmz2-vwda` fallback).
- **Injury Deaths** (`/injury-deaths`, added 2026-09) — Feature #8 from the
  backlog below, Phase 1. Suicide and homicide annual trends since 1999,
  each split into a total line and a by-firearm line, plus a drug-overdose
  figure. All of it reads rows already in `/data/mortality.json` (the
  113-cause list) — no new pipeline era needed for suicide/homicide/firearm.
  `src/api/injuryDeaths.js` has the full picking logic + caveats. The
  overdose series is a rough stand-in ("Accidental poisoning and exposure
  to noxious substances") — it undercounts real overdose deaths (misses
  suicide/undetermined-intent poisonings) and is visibly undercounted in
  its last 1–2 years since overdose deaths take longer to certify than
  most causes; the last 2 points render muted with a stronger caveat than
  the site's usual "provisional" label. A proper fix needs a dedicated
  WONDER pull (the "Drug/Alcohol Induced Causes" grouping) — Phase 2,
  not done. Two new embed configs (`suicide-deaths`, `homicide-deaths`)
  in `EmbedView.vue`.

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

**Beyond the 7 sections:** the sidebar's "Writing" + "Project" groups
(`nav.js` `secondaryGroups`) and a trimmed `App.vue` `<footer>` link the
standalone routes — `/notes` + `/notes/:slug` (**Data Notes** — see
below), `/privacy` (`PrivacyView.vue`, plain content; no
cookies / no ads / no third-party requests, and an **"Analytics" section
that says cookieless aggregate analytics is planned** rather than
promising "no analytics" — keep it truthful, and when a tool ships, edit
that section to name it), `/api` (`ApiView.vue`, documents the `/data/*.json`
snapshots as a public CORS-open read-only API; `.htaccess` sends
`Access-Control-Allow-Origin: *` on `*.json`), `/contact` (`ContactView.vue`
— GitHub Issues for bugs, a runtime-assembled `feedback@whywedie.org`
mailto for feedback; also in the sidebar's "Project" group), and
`/articles` + `/articles/:slug` (the blog — see **Articles** below). All
added directly in `router/index.js`, not via `nav.js`.

**Articles** (`/articles`): blog-style essays on data oddities (COVID, 1918
influenza, the 2011 heart-disease dip, …). Each is a folder
`src/articles/<slug>/` with an `index.md` (YAML frontmatter + prose,
compiled to a Vue component by **`unplugin-vue-markdown`** — wired in
`vite.config.js`, `vue({ include: [/\.vue$/, /\.md$/] })`). Prose is
Markdown; a story that needs a chart puts a Vue component right in the `.md`
via its own `<script setup>` block — either `@/components/TimeSeriesChart.vue`
directly or a bespoke figure `.vue` colocated in the article folder, wrapped
in `@/components/ArticleFigure.vue` (framed `<figure>` + caption + source).
`src/articles/index.js` is the registry (`import.meta.glob('./*/index.md')`,
sorted by `date` desc); `src/views/ArticlesView.vue` is the index list,
`src/views/ArticleView.vue` renders one (page chrome + `.article-prose`
container in `style.css` + per-article head/`BlogPosting` JSON-LD from
frontmatter). Frontmatter: `title`, `date` ("YYYY-MM-DD", quote it),
`description` (required — card blurb + meta + OG); optional `updated`,
`tags[]`, `draft: true` (hidden from the index + sitemap + feed in a prod
build; still reachable by direct URL, `noindex`; visible in `npm run dev`).
`unplugin-vue-markdown` exports each frontmatter key as a **named export**
(not a `frontmatter` object) — the registry reads `mod.title` etc. The
first stub, `2011-heart-disease-drop/`, is `draft: true` — a working
template, not finished copy.

**Data Notes** (`/notes`): a SEPARATE short-form type — one chart + a
paragraph or two, kept visually and structurally distinct from Articles so
readers don't conflate them. Flat files `src/notes/<slug>.md` (not
folder-per); registry `src/notes/index.js`; `src/views/NotesView.vue`
(a tight dated list) + `src/views/NoteView.vue` (lighter chrome — "DATA
NOTE" eyebrow, smaller title — same `.article-prose` body). Frontmatter is
minimal: `title`, `date`, `description`, optional `draft` — **no** `tags`,
**no** `updated`. Schema is `Article` (not `BlogPosting`) via `noteJsonLd()`.
Own feed `dist/notes.xml` (the shared `rssFeed()` helper in
`vite.config.js`), own `<link rel=alternate>`, own footer link; `/articles`
and `/notes` cross-link. First stub `us-deaths-past-3-million.md` is
`draft: true`.

**SEO:** `@unhead/vue` — `App.vue` sets title / description / canonical /
OG / Twitter / a `WebSite` JSON-LD per route (source: route `meta` ←
`nav.js` + `src/seo.js`); the 5 data views add a `Dataset` JSON-LD via
`datasetJsonLd()`, and article pages a `BlogPosting` via `articleJsonLd()`.
`vite.config.js`'s `seoFiles()` plugin writes `dist/sitemap.xml` +
`dist/robots.txt` + `dist/feed.xml` (RSS, articles) at build — it re-reads
article frontmatter off disk with `gray-matter` (can't use
`import.meta.glob` in the config), so keep that in sync with the registry;
drafts are excluded. `og:image` → `/og.png` (shipped). Prerendering
(vite-ssg) was evaluated and deferred (Chart.js SSR guards + a risky
Apache rewrite; Google renders the SPA fine meanwhile). `@unhead/vue` is
on **v3** now (`createHead` from `@unhead/vue/client`); the old v1↔v2
friction that also counted against vite-ssg is gone.

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
  moment.** `src/nav.js` is the single source of truth for the 7 sidebar
  sections (path, name, shortLabel, label, description); both the
  router and the sidebar read from it. When a real feature needs state
  shared across components (e.g. a chart's selected year range persisting
  across a page), add **Pinia** with setup-style stores
  (`defineStore('id', () => { ... })`), split by bounded sub-domain rather
  than one monolith store.
- **Routing:** Vue Router 5, with routes generated from `src/nav.js` in
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
  nav.js                     # single source of truth for the 7 sidebar sections
  router/index.js            # routes generated from nav.js
  App.vue                    # app shell: sidebar + mobile top bar + page transitions
  style.css                  # Tailwind import, black/white design tokens, component classes
  seo.js                     # SEO constants + siteJsonLd / datasetJsonLd / articleJsonLd + STANDALONE_META
  charts/
    palette.js                # validated color palette for chart MARKS only (chrome stays mono)
  articles/
    index.js                  # article registry (import.meta.glob of ./*/index.md) + formatArticleDate
    <slug>/index.md           # one article: YAML frontmatter + Markdown prose + optional <script setup>
    <slug>/*.vue              # bespoke figure components that article's index.md imports
  data/
    causeNames.js             # plain-language labels for the rankable causes
    dailyFacts.js             # rough "N per year" scale facts for By the Numbers
  api/
    socrata.js                # generic data.cdc.gov Socrata (SODA) JSON client
    currentVitalEvents.js     # Socrata hmz2-vwda monthly births (fallback source for monthlyBirths.js)
    monthlyBirths.js          # monthly births from /data/natality_monthly.json (D192), Socrata fallback
    monthlyDeaths.js          # monthly all-cause deaths from /data/mortality_monthly.json
    historicalDeaths.js       # annual all-cause deaths from /data/mortality.json "All causes"
    lifeExpectancy.js         # Socrata w9j2-ggv5 life expectancy 1900-2018 + NCHS 2019-23 supplement
    deathsByAge.js            # Socrata y5bj-9g5w weekly deaths by age group, rolled up to years (2015-22)
    causesOfDeath.js          # reads /data/mortality.json (from pipeline/), reshapes for the view
    causeBreakdown.js         # reads /data/mortality_demographic.json — Sex/Race breakdown (optional)
    populationChange.js       # births (natality.json + e6fc-ccez) vs deaths (mortality.json) + natural increase
    dailyStats.js             # hmz2-vwda 12-month-ending births/deaths, for the daily average
    yearFacts.js              # per-year births/deaths/leading-cause for the Home "pick a year" panel
    natality.js               # annual births + fertility rate from /data/natality.json (+ monthly roll-up)
  lib/
    csv.js                    # toCsv / downloadCsv helpers
    chartImage.js             # Chart.js canvas -> watermarked PNG data URL + download
  composables/
    useAsyncData.js          # shared loading/error/data helper for section views
    useNamePreference.js     # friendly vs official cause names, persisted (localStorage)
    useClock.js              # one shared 4 Hz wall-clock ref + fractionOfDay/Year helpers (live counters)
  components/
    AppSidebar.vue           # sidebar: 7 data sections + Writing/Project groups (nav.js secondaryGroups)
    NavIcon.vue               # inline SVG icons per section (one v-if branch per section name)
    PageHeader.vue            # consistent page title/description header
    YearLookup.vue            # Home "in the year N" cross-section lookup
    RangeTabs.vue             # segmented control for a chart's time window
    TimeSeriesChart.vue       # Chart.js line — single-/multi-series; PNG btn + ResizeObserver (iframe fix)
    RankedBarChart.vue        # Chart.js horizontal bars — single-/multi-series; PNG btn + ResizeObserver
    ChartToolbar.vue           # data table (<details>) + CSV + Copy-link + Embed (<iframe> snippet)
    DataTable.vue              # sortable table of a chart's underlying rows (in-DOM, maxRows 130)
    ArticleFigure.vue         # framed <figure> + caption + source, for embedding charts in articles
    LiveCounters.vue          # "so far today / this year" ticking births/deaths (By the Numbers, Home)
    LiveNumber.vue            # one ticking integer (annual figure × fraction of day); big-number abbrev
    LifetimeTally.vue         # "In one lifetime" — births/deaths since a chosen year
  views/
    HomeView.vue              # overview + compact live counter + latest-articles teaser
    DeathStatisticsView.vue   # annual, monthly, life expectancy, seasonality, deaths by age
    CausesOfDeathView.vue     # ranked bars (compare periods) + trend (compare causes)
    BirthStatisticsView.vue   # provisional monthly births + YoY
    PopulationChangeView.vue  # births vs deaths, natural increase, century birth history
    ByTheNumbersView.vue      # live counters + "In one lifetime" + rotating scale facts + daily average
    ArticlesView.vue          # /articles index (card list)
    ArticleView.vue           # /articles/:slug — chrome + .article-prose + head/JSON-LD from frontmatter
    NotesView.vue             # /notes index (tight dated list)
    NoteView.vue              # /notes/:slug — lighter chrome, Article JSON-LD
    EmbedView.vue             # /embed/:slug — one bare chart for <iframe> embeds (App.vue renders chrome-less)
    ApiView.vue               # /api — the JSON snapshots as an open API (DataCatalog JSON-LD, CC0)
    ContactView.vue           # /contact ; PrivacyView.vue # /privacy
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

Adding an article: `mkdir src/articles/<slug>/`, write `index.md` with
frontmatter (`title`, `date`, `description`; `draft: true` while WIP) + prose;
`npm run dev` to preview (drafts show in dev). Charts go in a colocated `.vue`
imported from the `.md`'s `<script setup>`, wrapped in `<ArticleFigure>`.
Nothing else to register — the glob in `src/articles/index.js` and the
sitemap/feed builder both pick it up. Drop `draft` to publish. See
`2011-heart-disease-drop/` for the pattern.

## Design system

The **chrome** — sidebar, headers, buttons, cards, stat numbers, page
copy — is strictly black, white, and gray, no color. Tokens live in
`src/style.css` under `@theme` (`--color-ink`, `--color-paper`,
`--color-line`, `--color-muted`, etc.). Reusable component classes
(`.btn-primary`, `.btn-secondary`, `.card`, `.badge`, `.link-underline`)
keep buttons/links/cards consistent — rounded corners, subtle shadows,
hover/active states, visible focus rings (never remove `:focus-visible`).
Font is Inter, self-hosted via `@fontsource/inter` (latin subset, imported in `main.js`), with a system-font fallback — no third-party font request.

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
| Death Statistics — **life expectancy** | **1900–2023** | 1900–2018 Socrata `w9j2-ggv5` (`average_life_expectancy`); 2019–2023 committed NCHS-final supplement, dashed |
| Death Statistics — **seasonality** | last 6 complete years | mean deaths by calendar month, length-adjusted; includes the 2020–21 COVID waves |
| Death Statistics — **deaths by age** | **2015–2022** | Socrata `y5bj-9g5w` weekly→annual rollup, US/Unweighted, 6 NCHS age bands; ends 2022 (dataset not refreshed past ~2023) |
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
| By the Numbers — daily average | 12 months ending ~mid-2026 | rolling annual ÷ 365 |
| By the Numbers — "In one lifetime" | births 1960+, deaths 1968+ | sums the annual snapshots from a chosen year; input clamps to 1968 |

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

## SEO, analytics & monetization

The owner wants the site to stay **privacy-first** (no cookies, no
consent banner) but is open to modest monetization and *aggregate*
(cookieless) analytics. AdSense was ruled out — even non-personalized
mode loads Google's script, sets cookies, and forces an EEA/UK consent
banner. **Session recording / replay and per-visitor cursor+scroll
heatmaps are out** (privacy + consent). What's in: aggregate counts —
page views per section + a tally of ~10 named actions (chart toggles,
CSV, section links, outbound clicks). That's the "which button gets used
most" signal the owner wanted; an *aggregate* element-click heatmap
*view* built from those counts is fine (it's still just counts, no
per-visitor anything). `/privacy`'s wording is scoped to match — don't
re-broaden "no heatmaps" to an absolute.

**Shipped + deployed (2026-09):** `.htaccess` compression (via cPanel
"Optimize Website" — GoDaddy ignores `AddOutputFilterByType` in
`.htaccess`; the inert `mod_deflate`/`mod_brotli` block was removed, a
comment left in its place) + open CORS on `/data/*.json` + `index.html`
`Cache-Control: no-store` (kills the stale-HTML-after-deploy blank page);
lazy-load of `mortality_demographic.json`; `/privacy` + `/api` + `/contact`
pages + footer; `@unhead/vue` per-route head + `Dataset` / `WebSite` /
`BlogPosting` JSON-LD; build-generated `sitemap.xml` + `robots.txt` +
`feed.xml`; `favicon.svg` + `og.png`; **Inter self-hosted** (no third-party
requests at all now). Sitemap submitted to Google Search Console
(domain-verified via DNS). **Data licence → CC0 1.0** (was CC BY 4.0):
`/api` copy + the `Dataset` JSON-LD `license` now say CC0, with a "reference
appreciated" courtesy note (public-domain CDC source, so CC BY was
overreach). **On-page SEO pass (2026-09)** — the data views were near-empty
to a crawler (Chart.js `<canvas>` + click-gated tables). Now: `ChartToolbar`
renders the data table in an always-in-DOM `<details>` (`DataTable` maxRows
130); each data view has a data-built plain-text lead `<p>` (real figures in
prose); `TimeSeriesChart`/`RankedBarChart` take `ariaLabel` → `role="img"`;
`nav.js` has `seoTitle`/`seoDescription` per section (search-phrased, and
distinct from the 2024 book) that the router prefers over the UI label;
`<h1>`s carry "US"/the keyword. Still SPA-rendered — a light prerender
(bake text/tables, hydrate the canvas) is the next lever. **SEO audit
(2026-09-12)** — checked indexing status (`site:whywedie.org` returns
nothing yet — expected for a ~2-week-old domain with no inbound links;
robots.txt/sitemap/meta-robots/canonical all check out clean, so this is
age + backlinks, not a technical block), PageSpeed (blocked by the public
API's daily quota — no key configured, unresolved), and on-page basics
(no `<img>` tags site-wide so no alt-text gaps, single `<h1>` per page,
JSON-LD types correct, TTFB ~300–400ms). One real finding, fixed: the 5
`nav.js` `seoDescription`s + `DEFAULT_DESCRIPTION` were 163–198 characters
— past Google's ~155–160 char snippet cutoff, so they'd get truncated
mid-sentence in search results. Trimmed all to ≤155. **The bigger lever
by far is still backlinks** (currently ~zero) — the tabled distribution
checklist above (Wikipedia, Kaggle, r/dataisbeautiful, newsletters, HN)
matters more than any further on-page tweak at this stage. Bing Webmaster
Tools is still unclaimed (one click, "Import from Google Search
Console") — cheapest remaining item. **Articles/blog scaffold** — `/articles` + `/articles/:slug`,
Markdown-with-embedded-Vue via `unplugin-vue-markdown`; see the **Articles**
section up top. One `draft: true` stub (`2011-heart-disease-drop`); real
essays (COVID, 1918 flu, the 2011 heart-disease dip) still to be written.

**Contact — DONE (2026-09).** `/contact` page (`ContactView.vue`, route +
footer link): bugs → GitHub Issues (`github.com/LeviDahl/whywedie/issues`),
ideas/feedback → `feedback@whywedie.org` (address assembled at runtime, not
a literal in the markup). The alias is a free **ImprovMX** inbound forward
→ owner's Gmail (MX + merged SPF at GoDaddy, DNS live). `/privacy` has an
"If you get in touch" note.

**Cookieless analytics — DONE (2026-09).** **Umami Cloud**
(`data-website-id="94f0b47e-1d83-4076-b3b8-534a4618df91"`), script tag in
`index.html` with `data-do-not-track="true"`. `src/lib/analytics.js`
exports `trackEvent(name, data)` — a thin, silently-no-op wrapper around
`window.umami.track()`. Events wired: `csv_download` / `png_download` /
`link_copy` / `embed_copy` (`ChartToolbar.vue` + the two chart components,
keyed by the chart's filename/pngName), `chart_toggle` (`{ page, control,
value }` — metric/names/breakdown/generations toggles across all 4 data
views), `outbound_click` (`{ host }` — CDC/WONDER links in Home, Contact,
API, the sidebar, and the footer, via `data-umami-event` HTML attributes,
not JS), `contact_click` (`{ type: 'issue' | 'email' }` on `/contact`),
`embed_preview` (the `/embed/:slug` preview link in the Embed panel).
`/privacy`'s "Analytics" section names Umami + links its policy
(umami.is/privacy) instead of saying "planned."

**Deferred backlog (low priority, owner will decide when):**
- Bing Webmaster Tools — "Import from Google Search Console" is one click.
- Support / donation link — Ko-fi / GitHub Sponsors / Liberapay → footer.
- Prerendering (vite-ssg) — deferred: Chart.js needs SSR guards, and a
  risky Apache rewrite. (The `@unhead/vue` version friction that also
  counted against it is resolved — now on v3.) Only worth it if social
  unfurlers matter a lot; Google renders the SPA fine.
- ~~Self-host the Inter font~~ **DONE (2026-09).** `@fontsource/inter`
  (latin subset, weights 400–800) imported in `main.js`; the Google Fonts
  `<link>` + preconnects are gone from `index.html`. Zero third-party
  requests now — `/privacy` updated to say so.

**Dependencies (2026-09):** frontend and `pipeline/` are both fully on
current majors with a clean `npm audit` — vite 8, vue-router 5,
`@unhead/vue` 3, `@vitejs/plugin-vue` 6 on the site; `fast-xml-parser` 5
in the pipeline (bump verified by a byte-for-byte parse diff of all 16
committed `*.raw.xml` samples — see `pipeline/README.md`).

## Feature backlog & distribution (from a 2026-09 competitive scan)

Scanned Our World in Data, Worldometers, USAFacts. Ideas ranked; owner
picked **1–4 first, then 5–6, rest later**.

**Tier 1 — signature features (building now / next):**
1. ~~**Live-ticking counters**~~ **DONE (2026-09).** `LiveCounters.vue` —
   "so far today" + "so far this year" for births / deaths / net, ticking
   at 4 Hz off the wall clock, reset at local midnight / 1 Jan, labelled a
   projection. Full two-row version on By the Numbers (replaced the static
   "typical day" cards); a `compact` one-row version on Home under the hero. The By-the-Numbers
   "Meanwhile" scale facts also tick, via `LiveNumber.vue` + the shared
   `src/composables/useClock.js` (one 4 Hz interval for the whole page).
2. ~~**Embeddable charts**~~ **DONE (2026-09).** `/embed/:slug` — bare
   route (App.vue renders it chrome-less + `noindex`, `<router-view>`
   keyed on `fullPath`). `src/views/EmbedView.vue` has 4 configs
   (`us-deaths`, `us-births`, `births-vs-deaths`,
   `leading-causes-of-death`) reusing the `api/` modules; `metric` /
   `range` from the query. `ChartToolbar` gains an **Embed** panel
   (`embedSlug` + optional `embedParams`) with a copy-paste `<iframe>`
   snippet, wired on the four primary charts. `TimeSeriesChart` /
   `RankedBarChart` grew a `ResizeObserver` that forces `chart.resize()`
   — Chart.js's own observer latches onto a width-0 first paint inside a
   fresh iframe and never self-corrects.
3. ~~**Download chart as PNG**~~ **DONE (2026-09).** Hover-reveal "PNG"
   button on every `TimeSeriesChart` / `RankedBarChart`; `src/lib/chartImage.js`
   composites the canvas onto white + stamps a "whywedie.org" + source
   footer. Retina-res, guards a 0-size canvas.
4. ~~**Data Notes**~~ **DONE (2026-09).** Separate `/notes` + `/notes/:slug`,
   flat `src/notes/*.md`, `NotesView` + `NoteView`, `noteJsonLd()`
   (`Article`), `dist/notes.xml`, footer link + article↔note cross-links.
   See the **Data Notes** section up top. First stub is `draft: true`.

**Tier 2 — data the site is missing (all high search volume):**
5. ~~**Life expectancy**~~ **DONE (2026-09).** "Life Expectancy at Birth"
   section on `/death-statistics`. `src/api/lifeExpectancy.js` reads
   Socrata `w9j2-ggv5` (it *does* carry `average_life_expectancy`, not
   just rates) for 1900–2018 + a small committed NCHS-final supplement
   2019–2023 (flagged, dashed). Browser-direct, no pipeline. The 1918 flu
   crater + COVID dip both show.
6. ~~**Deaths by age**~~ **DONE (2026-09).** "Deaths by Age" section on
   `/death-statistics`. `src/api/deathsByAge.js` rolls up Socrata
   `y5bj-9g5w` ("Weekly Counts of Deaths by Jurisdiction and Age", US /
   Unweighted) week→year client-side, keeping full-52-week years
   (2015–2022 today). A WONDER `by_age` era would refresh + extend it.
7. Leading causes of death **by age group** (WONDER Age × Cause) —
   "top causes of death for people in their 30s", very high intent.
8. ~~Drug overdose / suicide / firearm deaths as first-class topics~~
   **Phase 1 DONE (2026-09)** — `/injury-deaths`, one combined section (not
   3 separate ones — chosen to keep the sidebar from growing 6→9 at once).
   Suicide + homicide + firearm-share ship from existing `mortality.json`
   rows; overdose is a rough proxy pending Phase 2 (a real WONDER
   Drug/Alcohol Induced Causes pull). See "Current state" above.

**Tier 3 — expansions:**
9. State-level data — WONDER is national-only for the pipeline, but
   Socrata has state all-cause deaths + births → ~50× more rankable pages.
10. ~~"Since you were born"~~ **DONE (2026-09).** `LifetimeTally.vue`
    ("In one lifetime" on `/by-the-numbers`) — enter a year, get US
    births + deaths since (sums the annual snapshots, clamps to 1968+).
11. ~~Seasonality~~ **DONE (2026-09).** "When in the Year People Die" on
    `/death-statistics` — mean deaths by calendar month over the last 6
    complete years, length-adjusted to 30.4 days; the winter U-shape.
12. International comparison — US vs peer countries on death rate / life
    expectancy / fertility (needs World Bank / UN / OWID data).

**Distribution / backlinks checklist.** Owner decided (2026-09): **do the
first Note + the Wikipedia adds first, table the rest until those two are
live.**

*In progress:*
- ~~Publish 1 short Note~~ **DONE** — `src/notes/accidents-passed-stroke.md`
  ("America's #3 cause of death quietly changed", published, live).
- **Wikipedia** — External-links / data-source adds drafted for *Life
  expectancy in the United States*, *Demographics of the United States*,
  *List of causes of death by rate*, *Drug overdose deaths in the United
  States* (exact wikitext + placement handed to the owner; COI-disclose
  and prefer the Talk page). Not inline citations for facts (CDC is the
  better source there); not an EL dump.

*Tabled until the two above are live:*
- Finish a full **Article** → then **Show HN** (Claude drafts title +
  first comment).
- **Kaggle Datasets** + **data.world** — a dataset entry linking `/api`.
- **University health-sciences librarians** — short email → `.edu` link.
- **r/dataisbeautiful** (one chart as `[OC]`), r/dataviz, r/datasets,
  **HelpMeViz**.
- Newsletters: **Data Elixir** (submit form), **Dataviz Universe**,
  **Dashing Data Viz**, **Flowing Data** (pitch a finding). Data Is
  Plural is dormant since Aug 2025 — skip.
- **Bing Webmaster Tools** — "Import from Google Search Console".
- Google Dataset Search — no submission; `/api` `DataCatalog` + per-view
  `Dataset` JSON-LD feed it. Re-check ~1 month out.
- ~~Cookieless analytics~~ **DONE (2026-09)** — see above.
- Support/donation link → footer; pipeline hosting (unblocks feature 7,
  #8 Phase 2's proper overdose pull, and refreshing deaths-by-age past
  2022); the "Mortality" (Death Statistics + Causes of Death + Injury
  Deaths) vs. "Births & Population" nav regroup — owner flagged the
  sidebar getting crowded (2026-09-12, now at 7 top-level items with
  Injury Deaths added) but said current shape is fine for now; revisit
  if 8 or 9 gets added too.

**Done for discovery (2026-09):** GitHub repo description + homepage +
topics (were blank); `DataCatalog` JSON-LD on `/api` with real
`contentUrl` per file; `sameAs` → repo in site schema; first Data Note
published.
