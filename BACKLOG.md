# BACKLOG.md — what's actually left

One flat list of open work, so "what's left" doesn't have to be asked in
chat every time. The *why* behind each item — research, false starts,
technical constraints — stays in `CLAUDE.md` (search the heading named in
parens); this file is just the todo list. Update it in place as things
ship or new ideas come up — don't let it drift out of sync the way the
scattered mentions in `CLAUDE.md` did.

## Needs you specifically (not something Claude can push forward alone)

- **Finish the 2011 heart-disease-dip article** —
  `src/articles/2011-heart-disease-drop/index.md`, still `draft: true`.
  You're the intended author on these; Claude built the working
  template/scaffold, not the prose.
- **Post the Wikipedia adds** — wikitext already drafted for *Life
  expectancy in the United States*, *Demographics of the United States*,
  *List of causes of death by rate*, *Drug overdose deaths in the United
  States* (CLAUDE.md "Distribution / backlinks checklist"). It's your
  Wikipedia account and a COI disclosure, so it has to be you — copy the
  drafted wikitext in, prefer the Talk page first.
- **Pipeline hosting decision** — nothing recurring can be automated on
  the CDC pipeline until you pick where it runs. GitHub Actions was
  investigated and ruled out on the *current* GoDaddy DB specifically —
  its MySQL has TLS fully disabled on the wire, so allowing `%`-host
  access (needed for GitHub's rotating runner IPs) would be unencrypted
  DB access from the whole internet. Needs either a small always-on host
  with a fixed IP GoDaddy's Remote MySQL can allowlist, or a DB host with
  TLS enabled. Unlocks: scheduled `provisional*`/`monthly`/`current` era
  reruns, refreshing Deaths-by-Age past 2022, and the age-breakdown
  (`icd10_age`/`provisional_age`) D176 continuation monthly instead of by
  hand.
- **GraveMatters / OddsOfDying domain names** — you said you'd look into
  these; no pending action from Claude.

## Tabled until the Article + Wikipedia adds are live

Your own sequencing call (2026-09) — work this list only after the two
items above ship:

- Show HN (once a full Article exists, not just the draft stub)
- Kaggle Datasets + data.world — a dataset entry linking `/api`
- University health-sciences librarian outreach (short email → `.edu` link)
- r/dataisbeautiful (one chart as `[OC]`), r/dataviz, r/datasets, HelpMeViz
- Newsletter pitches: Data Elixir, Dataviz Universe, Dashing Data Viz, Flowing Data

## Deferred / lower priority (no rush, Claude can pick these up any time)

- **Prerendering (vite-ssg)** — needs Chart.js SSR guards + a somewhat
  risky Apache rewrite. Only worth it if social-card unfurls start to
  matter; Google already renders the SPA fine as-is.
- **Continuous ranked-bar Causes-of-Death view across the 1979/1999 ICD
  seam** — needs a real comparability-ratio crosswalk (bigger job than
  the trend-line approximation already shipped).
- **Finer pre-1999 leading-cause data** — WONDER's D16/D74 also expose
  "ICD-9 72 Groups" / "ICD-8 69 Groups" (~70 causes vs. today's 17
  chapters), a `--dump` away, not pulled yet.
- **Sex/Race-breakdown period comparison** — blocked on the ranked chart
  having only one color axis, already spent on the subgroup (CLAUDE.md
  "Tabled — possible enhancement" has the two possible paths).

## Periodic rechecks (not urgent, just don't forget)

- **Census PEP fertility-rate vintage** — re-run
  `pipeline/fetch-census-fertility.js` once vintage 2024 exists (currently
  on vintage 2023; Census lags ~2 years).
- **Socrata `hmz2-vwda` currency** — last checked 2026-09, still stuck at
  June 2024 despite being labeled "current provisional." Swap
  `DATASET_ID` in `currentVitalEvents.js` if CDC ever refreshes/replaces it.
- **Google PageSpeed audit** — blocked last attempt by the public API's
  daily quota (no key configured). Worth a one-off re-run if search
  performance ever needs a real look.
- **Google Dataset Search indexing** — no action needed, just re-check
  ~1 month after the `DataCatalog`/`Dataset` JSON-LD went live.

## Recently closed (context, not action)

- Bing Webmaster Tools — **done**. Account created + sitemap submitted
  manually (the Google Search Console import failed, so this wasn't the
  one-click path originally assumed).
- Sidebar overflow on smaller phones — **done** (2026-09-13).
- Support/donation (GitHub Sponsors) link — **done**, footer + sidebar.
- Features 7 (age breakdown), 8 Phase 2 (real overdose rate), 9 (state
  comparison), 12 (international) — **all done** (2026-09-13).
