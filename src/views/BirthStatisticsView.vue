<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import RangeTabs from '@/components/RangeTabs.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchCurrentMonthlyBirths } from '@/api/currentVitalEvents.js'
import { fetchAnnualNatality } from '@/api/natality.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'birth-statistics')

// Two sources: provisional monthly counts (Socrata, browser-direct), and
// the annual births + fertility-rate series (/data/natality.json — Socrata
// baseline now, WONDER natality pipeline later).
const monthly = useAsyncData(fetchCurrentMonthlyBirths)
const annual = useAsyncData(fetchAnnualNatality)
onMounted(() => {
  monthly.load()
  annual.load()
})

const integerFormatter = (v) => (v == null ? '—' : v.toLocaleString())
const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))
const tail = (arr, n) =>
  n === Infinity ? (arr ?? []).slice() : (arr ?? []).slice(Math.max(0, (arr ?? []).length - n))

// --- monthly ---
const latestIndex = computed(() =>
  monthly.data.value?.labels?.length ? monthly.data.value.labels.length - 1 : -1
)
const latestLabel = computed(() =>
  latestIndex.value >= 0 ? monthly.data.value.labels[latestIndex.value] : null
)
const latestBirths = computed(() =>
  latestIndex.value >= 0 ? monthly.data.value.values[latestIndex.value] : null
)
const yoy = computed(() => {
  const d = monthly.data.value
  if (!d || latestIndex.value < 12) return null
  const now = d.values[latestIndex.value]
  const prior = d.values[latestIndex.value - 12]
  if (!now || !prior) return null
  return ((now - prior) / prior) * 100
})
const monthlyTable = computed(() => {
  const d = monthly.data.value
  if (!d) return null
  return {
    columns: ['Month', 'Births'],
    rows: d.labels.map((m, i) => [m, d.values[i]]),
    note: `Data through ${d.labels.at(-1)}`
  }
})
const MONTHLY_RANGES = [
  { key: '1y', label: '1 yr', n: 12 },
  { key: 'max', label: 'Max', n: Infinity }
]
const monthlyRange = ref('max')
const monthlyView = computed(() => {
  const d = monthly.data.value
  if (!d?.labels?.length) return null
  const n = MONTHLY_RANGES.find((r) => r.key === monthlyRange.value)?.n ?? Infinity
  return { labels: tail(d.labels, n), values: tail(d.values, n) }
})

// --- annual ---
const ANNUAL_METRICS = {
  births: { key: 'births', label: 'Births', fmt: integerFormatter, axis: 'Births' },
  fertilityRate: {
    key: 'fertilityRate',
    label: 'Fertility rate',
    fmt: rateFormatter,
    axis: 'Births per 1,000 women 15–44'
  },
  birthRate: {
    key: 'birthRate',
    label: 'Birth rate',
    fmt: rateFormatter,
    axis: 'Births per 1,000 people'
  }
}
const annualMetric = ref('births')
const annualFmt = computed(() => ANNUAL_METRICS[annualMetric.value].fmt)

// Pew Research Center generation cutoffs (by birth year). Pew defines
// Boomer→Gen Z; "Gen Z" has no published end year, so it runs to the chart
// edge. Shown only under the Births metric — they're birth cohorts.
const PEW_GENERATIONS = [
  { from: 1928, to: 1945, label: 'Silent' },
  { from: 1946, to: 1964, label: 'Boomers' },
  { from: 1965, to: 1980, label: 'Gen X' },
  { from: 1981, to: 1996, label: 'Millennials' },
  { from: 1997, to: 2100, label: 'Gen Z' }
]
// Ones that overlap the births data (starts 1960) — offered as drill-downs.
const GEN_CHOICES = PEW_GENERATIONS.filter((g) => g.to >= 1960 && g.from <= 2025)

// Generations overlay: on/off, plus an optional drilled-into cohort. Both
// apply only to the Births metric.
const showGenerations = ref(true)
const genActive = computed(() => annualMetric.value === 'births' && showGenerations.value)

// One selector drives the annual window: a numeric range key OR a cohort
// label. Numeric keys live in ANNUAL_RANGES (below); cohort keys are the
// generation labels.
const annualWindow = ref('25y')
const selectedGen = computed(() =>
  PEW_GENERATIONS.find((g) => g.label === annualWindow.value) ?? null
)
function pickWindow(key) {
  annualWindow.value = key
}
// Clicking a band drills to that cohort (toggles back to Max if re-clicked).
function onBandClick(band) {
  if (!genActive.value) return
  annualWindow.value = annualWindow.value === band.label ? 'max' : band.label
}
const annualBands = computed(() =>
  genActive.value
    ? PEW_GENERATIONS.map((g) => ({ ...g, active: g.label === annualWindow.value }))
    : []
)

// Metric explainer popover — "fertility rate" vs "birth rate" isn't common
// knowledge. Mirrors the same control on Causes of Death.
const showMetricHelp = ref(false)

// A partial trailing year (D192's mid-year total, e.g. "2026 through June")
// is dropped from the plotted line — half a year next to full ones reads as
// a crash — and shown as a caption instead. Complete-but-provisional years
// (rate/population not final yet) stay on the chart, rendered muted/dashed.
const plottedYears = computed(() => {
  const d = annual.data.value
  if (!d) return []
  return d.years.filter((y, i) => !d.partial[i])
})
const partialYears = computed(() => {
  const d = annual.data.value
  if (!d) return []
  return d.years.filter((y, i) => d.partial[i]).map((y) => ({ year: y, births: d.byYear[y]?.births }))
})
const annualMuted = computed(() => {
  const d = annual.data.value
  if (!d) return []
  return plottedYears.value.map(
    (y) => d.byYear[y]?.births != null && d.byYear[y]?.fertilityRate == null
  )
})
const hasProvisional = computed(() => annualMuted.value.some(Boolean))

const ANNUAL_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '25y', label: '25 yr', n: 25 },
  { key: 'max', label: 'Max', n: Infinity }
]
// If generations are switched off (or the metric changes away from Births)
// while drilled into a cohort, fall back to the widest view.
watch(genActive, (on) => {
  if (!on && selectedGen.value) annualWindow.value = 'max'
})

const annualView = computed(() => {
  const d = annual.data.value
  if (!plottedYears.value.length) return null
  const all = plottedYears.value
  const vals = all.map((y) => d.byYear[y]?.[annualMetric.value] ?? null)
  const g = genActive.value ? selectedGen.value : null
  let keep
  if (g) {
    keep = all.map((y) => y >= g.from && y <= g.to)
  } else {
    const n = ANNUAL_RANGES.find((r) => r.key === annualWindow.value)?.n ?? Infinity
    keep = all.map((_, i) => i >= all.length - n)
  }
  return {
    labels: all.filter((_, i) => keep[i]),
    values: vals.filter((_, i) => keep[i]),
    muted: annualMuted.value.filter((_, i) => keep[i])
  }
})

const annualTable = computed(() => {
  const d = annual.data.value
  if (!d) return null
  return {
    columns: ['Year', 'Births', 'Fertility rate', 'Birth rate'],
    rows: d.years.map((y) => [y, d.byYear[y]?.births ?? '', d.byYear[y]?.fertilityRate ?? '', d.byYear[y]?.birthRate ?? '']),
    note: `${d.years[0]}–${d.years.at(-1)}`
  }
})
</script>

<template>
  <div>
    <PageHeader eyebrow="Natality" title="Birth Statistics" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <!-- Stat callouts -->
      <div v-if="latestBirths != null" class="grid gap-4 sm:grid-cols-2">
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Births in {{ latestLabel }} (most recent month available)
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {{ integerFormatter(latestBirths) }}
          </dd>
        </div>
        <div v-if="yoy != null" class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Change vs. the same month a year earlier
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {{ yoy >= 0 ? '+' : '' }}{{ yoy.toFixed(1) }}%
          </dd>
        </div>
      </div>

      <!-- Annual births + fertility rate -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Annual Births &amp; Fertility Rate</h2>
          <p v-if="annualView" class="text-sm text-muted">
            {{ annualView.labels[0] }}–{{ annualView.labels.at(-1) }}
          </p>
        </div>

        <div v-if="annual.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>
        <div v-else-if="annual.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
            <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ annual.error.value }}</p>
          </details>
          <button type="button" class="btn-secondary mt-4" @click="annual.load">Try again</button>
        </div>
        <template v-else-if="annual.data.value?.years?.length">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="(m, key) in ANNUAL_METRICS"
                :key="key"
                type="button"
                class="px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="annualMetric === key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="annualMetric = key"
              >
                {{ m.label }}
              </button>
            </div>
            <button
              type="button"
              class="grid size-4 place-items-center rounded-full border border-line-strong text-[10px] font-semibold leading-none text-muted transition-colors hover:border-ink hover:text-ink"
              :class="{ 'border-ink text-ink': showMetricHelp }"
              :aria-expanded="showMetricHelp"
              aria-label="What do these figures mean?"
              @click="showMetricHelp = !showMetricHelp"
            >
              i
            </button>

            <div
              v-if="annualMetric === 'births'"
              class="flex items-center gap-2 sm:ml-auto"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Generations</span>
              <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
                <button
                  v-for="opt in [{ v: true, l: 'On' }, { v: false, l: 'Off' }]"
                  :key="opt.l"
                  type="button"
                  class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                  :class="showGenerations === opt.v ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                  @click="showGenerations = opt.v"
                >
                  {{ opt.l }}
                </button>
              </div>
            </div>
          </div>

          <!-- Window: numeric ranges, plus per-cohort drill-downs when the
               generations overlay is on. -->
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Show</span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="r in ANNUAL_RANGES"
                :key="r.key"
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="annualWindow === r.key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="pickWindow(r.key)"
              >
                {{ r.label }}
              </button>
            </div>
            <div v-if="genActive" class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="g in GEN_CHOICES"
                :key="g.label"
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="annualWindow === g.label ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="pickWindow(g.label)"
              >
                {{ g.label }}
              </button>
            </div>
          </div>

          <dl v-if="showMetricHelp" class="card mb-4 space-y-2 text-xs text-muted">
            <div>
              <dt class="inline font-semibold text-ink">Births</dt>
              — the raw count of live births in the year. Moves with the size of
              the population of childbearing age, not just with how many children
              people are having.
            </div>
            <div>
              <dt class="inline font-semibold text-ink">Fertility rate</dt>
              — live births per 1,000 women aged 15–44 (the "general fertility
              rate"). Divides out the size of that group, so it shows the
              underlying tendency to have children. It is <em>not</em> the "total
              fertility rate" (the ~2.1 "replacement" number), which estimates
              lifetime births per woman.
            </div>
            <div>
              <dt class="inline font-semibold text-ink">Birth rate</dt>
              — live births per 1,000 people of <em>all</em> ages (the "crude
              birth rate"). Useful for comparing against the crude death rate on
              the Population Change page, but sensitive to a country's overall
              age mix.
            </div>
          </dl>

          <div class="card">
            <TimeSeriesChart
              :labels="annualView.labels"
              :values="annualView.values"
              :muted-points="annualView.muted"
              :bands="annualBands"
              :series-label="ANNUAL_METRICS[annualMetric].axis"
              :value-formatter="annualFmt"
              @band-click="onBandClick"
            />
            <ChartToolbar
              v-if="annualTable"
              :columns="annualTable.columns"
              :rows="annualTable.rows"
              :note="annualTable.note"
              filename="whywedie-annual-births"
            />
          </div>
          <p v-if="genActive" class="mt-3 text-xs text-muted">
            Shaded bands are the <a class="link-underline" href="https://www.pewresearch.org/short-reads/2019/01/17/where-millennials-end-and-generation-z-begins/" target="_blank" rel="noopener">Pew Research Center</a>
            generation cutoffs by birth year (Gen X 1965–1980, Millennials 1981–1996, Gen Z 1997 on).
            Click a band — or a cohort button above — to zoom to just those years; <em>Generations: Off</em> hides them.
          </p>
          <p v-for="p in partialYears" :key="p.year" class="mt-3 text-xs text-muted">
            <strong class="font-semibold text-ink">{{ p.year }} is a partial year</strong> and is left
            off the chart — CDC has only published part of it so far
            ({{ integerFormatter(p.births) }} births to date).
          </p>
          <p v-if="hasProvisional" class="mt-3 text-xs text-muted">
            The dashed, greyed tail is provisional: the count is close to final but the fertility and
            birth rates aren't published for those years yet (they need finalized population figures).
          </p>
          <p class="mt-3 text-xs text-muted">{{ annual.data.value.coverage.note }}</p>
          <p class="mt-1 text-xs text-muted">Source: {{ annual.data.value.source }}.</p>
        </template>
      </section>

      <!-- Current monthly section -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Monthly Births (Current)</h2>
          <div class="flex items-center gap-3">
            <p v-if="monthlyView" class="text-sm text-muted">
              {{ monthlyView.labels[0] }}–{{ monthlyView.labels.at(-1) }}
            </p>
            <RangeTabs
              v-if="monthly.data.value?.labels?.length"
              v-model="monthlyRange"
              :options="MONTHLY_RANGES"
              aria-label="Monthly births range"
            />
          </div>
        </div>

        <div
          v-if="monthly.loading.value"
          class="card flex items-center justify-center py-20 text-sm text-muted"
        >
          Loading…
        </div>

        <div v-else-if="monthly.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
            <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ monthly.error.value }}</p>
          </details>
          <button type="button" class="btn-secondary mt-4" @click="monthly.load">Try again</button>
        </div>

        <template v-else-if="monthlyView">
          <div class="card">
            <TimeSeriesChart
              :labels="monthlyView.labels"
              :values="monthlyView.values"
              series-label="Births"
              :value-formatter="integerFormatter"
            />
            <ChartToolbar
              v-if="monthlyTable"
              :columns="monthlyTable.columns"
              :rows="monthlyTable.rows"
              :note="monthlyTable.note"
              filename="whywedie-monthly-births"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            CDC's provisional monthly release, published on a quarterly cycle — it won't always reach
            the present month. {{ latestLabel }} is the most recent month CDC has published as of this
            data pull.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ monthly.data.value.source }}.</p>
        </template>
      </section>

      <!-- Population-trend cross-link -->
      <section>
        <div class="card">
          <h2 class="text-base font-semibold text-ink">Births vs. deaths</h2>
          <p class="mt-2 text-sm text-muted">
            The US still records well over a million more births than deaths a year — but that margin
            has shrunk by roughly a third since 1999, and in 2021 deaths briefly won. The
            <RouterLink to="/population-change" class="link-underline">Population Decline / Gain</RouterLink>
            page tracks that gap.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
