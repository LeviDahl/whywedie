<script setup>
// Static content page documenting the /data/*.json snapshots as a public,
// read-only data API. No backend — these are just cached static files with
// CORS enabled (see public/.htaccess). Keep the endpoint list in sync with
// pipeline/build-snapshots.js.
const BASE = 'https://whywedie.org/data'

const endpoints = [
  {
    path: '/meta.json',
    what: 'Pipeline provenance — which CDC WONDER databases and year ranges feed each snapshot.',
    size: '~3 KB'
  },
  {
    path: '/mortality.json',
    what: 'Annual US deaths, national. All-cause + the NCHS 113-cause list (1999–present) + broad ICD chapters and sub-chapters (1968–1998). Deaths, population, crude rate, age-adjusted rate.',
    size: '~2.5 MB'
  },
  {
    path: '/mortality_demographic.json',
    what: 'Annual US deaths by cause × {sex | race}, 1999–present. Race categories change at the 2020/2021 seam (bridged → single-race).',
    size: '~6 MB'
  },
  {
    path: '/mortality_monthly.json',
    what: 'All-cause US deaths by calendar month, 2018–present (CDC provisional).',
    size: '~12 KB'
  },
  {
    path: '/natality.json',
    what: 'Annual US births, 1960–present, with the general fertility rate and crude birth rate.',
    size: '~8 KB'
  },
  {
    path: '/natality_monthly.json',
    what: 'US births by calendar month, 2023–present (CDC provisional).',
    size: '~4 KB'
  }
]

const curlExample = `curl -s ${BASE}/natality.json | jq '.byYear["2023"]'`
const jsExample = `const res = await fetch('${BASE}/mortality.json')
const data = await res.json()
// data.byCause["10:#Diseases of heart (I00-I09,I11,I13,I20-I51)"].deaths`
const pyExample = `import requests
data = requests.get("${BASE}/mortality.json").json()
years = data["years"]                       # [1968, 1969, ...]
heart = data["byCause"]["10:#Diseases of heart (I00-I09,I11,I13,I20-I51)"]
print(dict(zip(heart["years"], heart["deaths"])))`
</script>

<template>
  <div>
    <header class="border-b border-line px-6 py-14 sm:px-10 sm:py-20">
      <div class="mx-auto max-w-3xl">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">For researchers</p>
        <h1 class="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Open data API</h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Every chart here is drawn from a handful of plain JSON files. They're served with open
          CORS, cached at the edge, and free to use — a small, stable dataset that stitches CDC's
          fragmented mortality and natality series into one shape, 1900–present.
        </p>
      </div>
    </header>

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl space-y-10">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">Endpoints</h2>
          <p class="mt-3 text-sm text-muted">
            Base URL <code class="rounded bg-paper-soft px-1.5 py-0.5 text-ink">{{ BASE }}</code> —
            all <code class="rounded bg-paper-soft px-1.5 py-0.5 text-ink">GET</code>, no key, no
            rate limit today.
          </p>
          <dl class="mt-5 space-y-4">
            <div v-for="e in endpoints" :key="e.path" class="border-b border-line pb-4">
              <dt class="flex flex-wrap items-baseline gap-x-3">
                <code class="text-sm font-semibold text-ink">{{ e.path }}</code>
                <span class="text-xs text-muted">{{ e.size }}</span>
              </dt>
              <dd class="mt-1 text-sm leading-relaxed text-muted">{{ e.what }}</dd>
            </div>
          </dl>
          <p class="mt-4 text-sm text-muted">
            Each file carries <code class="rounded bg-paper-soft px-1 text-ink">source</code>,
            <code class="rounded bg-paper-soft px-1 text-ink">fetchedAt</code>,
            <code class="rounded bg-paper-soft px-1 text-ink">coverage</code> (with a
            <code class="rounded bg-paper-soft px-1 text-ink">note</code> spelling out the caveats),
            and per-year / per-cause / per-month arrays aligned to a shared axis. Fetch one and read
            the keys — the shape is meant to be obvious.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">Examples</h2>
          <div class="mt-4 space-y-4">
            <div>
              <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Shell</p>
              <pre class="overflow-x-auto rounded-lg bg-paper-soft p-4 text-xs leading-relaxed text-ink"><code>{{ curlExample }}</code></pre>
            </div>
            <div>
              <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">JavaScript</p>
              <pre class="overflow-x-auto rounded-lg bg-paper-soft p-4 text-xs leading-relaxed text-ink"><code>{{ jsExample }}</code></pre>
            </div>
            <div>
              <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Python</p>
              <pre class="overflow-x-auto rounded-lg bg-paper-soft p-4 text-xs leading-relaxed text-ink"><code>{{ pyExample }}</code></pre>
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">
            Attribution &amp; licence
          </h2>
          <p class="mt-4 text-sm leading-relaxed text-muted">
            The underlying figures are U.S. Government works (CDC / NCHS, via
            <a href="https://wonder.cdc.gov/" target="_blank" rel="noopener" class="link-underline">CDC
            WONDER</a> and <a href="https://data.cdc.gov/" target="_blank" rel="noopener" class="link-underline">data.cdc.gov</a>)
            and carry no copyright. This project's compilation of them is offered under
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" class="link-underline">CC BY 4.0</a>:
            use it anywhere, just credit "whywedie.org" and cite CDC as the primary source. If you
            publish something built on it, a link back is appreciated.
          </p>
        </div>

        <div class="rounded-lg border border-line-strong bg-paper-soft p-5">
          <h2 class="text-sm font-semibold text-ink">No guarantees — and this may not stay free</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            This is a best-effort service on shared hosting. No uptime guarantee, no support SLA,
            and the file shapes may change without notice (breaking changes would move to a new
            path). Snapshots refresh on an irregular manual schedule — check
            <code class="rounded bg-paper px-1 text-ink">fetchedAt</code>. Heavy or automated use
            may lead to rate limiting, and the API may later move behind a key or onto a paid /
            managed platform. If you're relying on it for something real, cache your own copy — and
            a heads-up that it's in use is genuinely helpful.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
