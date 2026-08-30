# CLAUDE.md — Why We Die (whywedie.org)

Interactive site tracking US death, birth, and population statistics,
sourced live from CDC's open data platform (data.cdc.gov). Open site, no
authentication.

## Current state

Full sidebar shell (Home, Death Statistics Over Time, Causes of Death, Birth
Statistics, Population Decline/Gain). Home is fleshed out. **Death
Statistics Over Time is live** — two Chart.js charts (annual historical
deaths, current monthly deaths), fetched directly from data.cdc.gov's
Socrata JSON API in the browser. The other three sections are still "coming
soon" placeholders.

**This is a fully static site — no backend.** An earlier version used the
CDC WONDER API via a Node/Express proxy (`server/`); that's been removed
entirely. WONDER required XML/POST and had no CORS support, so it needed a
backend. data.cdc.gov's Socrata API is plain JSON with CORS support, so the
frontend calls it directly. Don't reintroduce a backend/proxy without a real
reason — the whole point of this rework was to not need one.

## Development Environment & Sandboxing

- **OS Platform:** macOS (Darwin). Use Unix-compliant commands only.
- **Sandboxing Rules:** Builds, package installations, and process executions
  should happen within the designated sandbox/dev environment for this repo,
  not against the host system directly.
- **Filesystem Isolation:** Never execute terminal commands that modify,
  write, or read files outside the project root directory, or on the host
  macOS filesystem. Do not alter global user configuration
  (`~/.zshrc`, `~/.npmrc`, etc.).

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
reads this file next.

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
  moment.** `src/nav.js` is the single source of truth for the 5 sidebar
  sections (path, label, description, status, planned data source); both the
  router and the sidebar read from it. When a real feature needs state
  shared across components (e.g. a chart's selected year range persisting
  across a page), add **Pinia** with setup-style stores
  (`defineStore('id', () => { ... })`), split by bounded sub-domain rather
  than one monolith store.
- **Routing:** Vue Router 4, with routes generated from `src/nav.js` in
  `src/router/index.js`. Keep using explicit lazy-loaded route components
  (`component: () => import(...)`) for code-splitting — this is already the
  pattern in place.

## macOS-Specific & Tooling Guidelines

- **Case Sensitivity:** macOS (APFS) is typically case-insensitive but
  case-preserving; Linux-based build/CI environments are case-sensitive.
  Make sure imports match file casing exactly on disk.
- **System Junk:** Ignore `.DS_Store` entirely (already in `.gitignore`).
- **Tooling Execution:** Right now, `npm run build` is the only automated
  verification available — run it before considering a change done. Don't
  request host macOS permissions, system keychains, or system notifications.

## Project structure

```
src/
  nav.js                     # single source of truth for the 5 sidebar sections
  router/index.js            # routes generated from nav.js
  App.vue                    # app shell: sidebar + mobile top bar + page transitions
  style.css                  # Tailwind import, black/white design tokens, component classes
  api/
    socrata.js                # generic data.cdc.gov Socrata (SODA) JSON client
    currentVitalEvents.js     # current monthly deaths + births (dataset hmz2-vwda)
    historicalDeaths.js       # historical annual death rollup (dataset muzy-jte6)
  composables/
    useAsyncData.js          # shared loading/error/data helper for section views
  components/
    AppSidebar.vue           # sidebar nav (desktop: static, mobile: slide-in drawer)
    NavIcon.vue               # inline SVG icons per section
    PageHeader.vue            # consistent page title/description header
    ComingSoonPanel.vue       # placeholder panel used by the 3 unbuilt sections
    TimeSeriesChart.vue       # generic Chart.js line chart, reused across sections
  views/
    HomeView.vue              # project overview (built out)
    DeathStatisticsView.vue   # live: annual chart + monthly chart, each with own caveats
    CausesOfDeathView.vue     # placeholder
    BirthStatisticsView.vue   # placeholder
    PopulationChangeView.vue  # placeholder
public/
  .htaccess                  # Apache rewrite for Vue Router history mode
```

Adding a 6th sidebar section: add an entry to `nav.js`, add a view file, add
it to the `viewComponents` map in `router/index.js`. Adding a new live-data
section: see "data.cdc.gov / Socrata API" below.

## Design system

Strictly black, white, and gray — no color anywhere. Tokens live in
`src/style.css` under `@theme` (`--color-ink`, `--color-paper`,
`--color-line`, `--color-muted`, etc.). Reusable component classes
(`.btn-primary`, `.btn-secondary`, `.card`, `.badge`, `.link-underline`)
keep buttons/links/cards consistent — rounded corners, subtle shadows,
hover/active states, visible focus rings (never remove `:focus-visible`).
Font is Inter (Google Fonts) with a system-font fallback.

## data.cdc.gov / Socrata API — read before touching a live-data section

This is a fully static site precisely because Socrata's API is
browser-friendly. That only holds if every new data pipeline follows the
same rules:

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

### ⚠️ `muzy-jte6` (historical annual rollup) has a partial final year

At time of writing, the most recent year (2023) only has 37 of ~52 weeks of
data — `historicalDeaths.js` fetches `count(*) as week_count` alongside the
sum specifically so `DeathStatisticsView.vue` can flag any year under 52
weeks (muted chart point + caption) instead of showing a misleadingly low
total next to full years. Keep this pattern for any future annual rollup
from a weekly/monthly source — don't silently sum an in-progress period.

### Scope tradeoff vs. the removed CDC WONDER approach

WONDER (removed) had finalized annual data back to 1999 plus an
age-adjusted rate measure. These Socrata pipelines only cover 2020–present
and raw counts only (no rate). That's a deliberate tradeoff for removing
the backend, not an oversight — if multi-decade trend views matter later,
consider adding a finalized longer-history source back for the historical
end specifically, run alongside these Socrata pipelines for the current
end, rather than trying to force old and new together into one series.

## Next steps

1. Causes of Death — pick a data.cdc.gov dataset for cause-of-death
   breakdowns, build following the pattern above (test the real API first)
2. Birth Statistics page — `fetchCurrentMonthlyBirths()` already exists in
   `currentVitalEvents.js`; the page just needs building
3. Population Decline/Gain — combine the births and deaths pipelines
4. Decide whether to add back a longer-history data source (see "Scope
   tradeoff" above)
5. Periodically re-check `hmz2-vwda`'s data currency (see ⚠️ above)
