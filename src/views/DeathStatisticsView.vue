<script setup>
import { computed, ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import RangeTabs from '@/components/RangeTabs.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchHistoricalAnnualDeaths } from '@/api/historicalDeaths.js'
import { fetchMonthlyDeaths } from '@/api/monthlyDeaths.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'death-statistics')

const historical = useAsyncData(fetchHistoricalAnnualDeaths)
const monthly = useAsyncData(fetchMonthlyDeaths)

onMounted(() => {
  historical.load()
  monthly.load()
})

const integerFormatter = (v) => (v == null ? '—' : v.toLocaleString())
const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))

// The annual chart plots either the raw count (WONDER, 1968+) or the
// age-adjusted rate, which extends back to 1900 from CDC's historical
// series. Crude rate has no pre-1968 source so it isn't offered here.
const ANNUAL_METRICS = {
  deaths: { key: 'totalDeaths', label: 'Total deaths', fmt: integerFormatter },
  ageAdjustedRate: {
    key: 'ageAdjustedRate',
    label: 'Age-adjusted rate',
    fmt: rateFormatter
  }
}
const metric = ref('deaths')
const metricFmt = computed(() => ANNUAL_METRICS[metric.value].fmt)

// --- Historical annual (1900–present for the rate, 1968+ for counts) ---
const annualYears = computed(() => historical.data.value?.years ?? [])
const latestYear = computed(() => annualYears.value.at(-1) ?? null)
const latestYearDeaths = computed(() => historical.data.value?.totalDeaths?.at(-1) ?? null)
const latestYearProvisional = computed(
  () => Boolean(historical.data.value?.isProvisional?.at(-1))
)
const hasProvisional = computed(() => historical.data.value?.isProvisional?.some(Boolean))
const firstProvisionalYear = computed(() => {
  const d = historical.data.value
  if (!d) return null
  const i = d.isProvisional.findIndex(Boolean)
  return i === -1 ? null : d.years[i]
})

// --- Current monthly --- (headline the latest COMPLETE month) ---
const latestCompleteMonthIdx = computed(() => {
  const d = monthly.data.value
  if (!d?.labels?.length) return -1
  for (let i = d.labels.length - 1; i >= 0; i--) {
    if (!d.partial?.[i]) return i
  }
  return d.labels.length - 1
})
const latestMonthLabel = computed(() =>
  latestCompleteMonthIdx.value >= 0
    ? monthly.data.value.labels[latestCompleteMonthIdx.value]
    : null
)
const latestMonthDeaths = computed(() =>
  latestCompleteMonthIdx.value >= 0
    ? monthly.data.value.values[latestCompleteMonthIdx.value]
    : null
)
const monthlyHasPartial = computed(() => monthly.data.value?.partial?.some(Boolean))

// --- time-range windows -------------------------------------------------
const ANNUAL_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '25y', label: '25 yr', n: 25 },
  { key: '50y', label: '50 yr', n: 50 },
  { key: 'max', label: 'Max', n: Infinity }
]
const MONTHLY_RANGES = [
  { key: 'ytd', label: 'YTD' },
  { key: '1y', label: '1 yr', n: 12 },
  { key: '5y', label: '5 yr', n: 60 },
  { key: 'max', label: 'Max', n: Infinity }
]
const annualRange = ref('max')
const monthlyRange = ref('5y')

const tail = (arr, n) => (n === Infinity ? arr.slice() : arr.slice(Math.max(0, arr.length - n)))

const annualView = computed(() => {
  const d = historical.data.value
  if (!d?.years?.length) return null
  const field = ANNUAL_METRICS[metric.value].key
  const series = d[field] ?? []
  // Trim the leading and trailing runs of nulls: the count series is empty
  // before 1968, and the age-adjusted rate has no value for the newest
  // provisional years until a pipeline run fills them — without this the
  // x-axis (and the "1900–YYYY" caption) would stretch past the last point.
  const start = series.findIndex((v) => v != null)
  const from = start < 0 ? 0 : start
  let to = series.length
  while (to > from && series[to - 1] == null) to--
  const years = d.years.slice(from, to)
  const values = series.slice(from, to)
  const muted = d.isProvisional.slice(from, to)
  const n = ANNUAL_RANGES.find((r) => r.key === annualRange.value)?.n ?? Infinity
  return { labels: tail(years, n), values: tail(values, n), muted: tail(muted, n) }
})

const monthlyView = computed(() => {
  const d = monthly.data.value
  if (!d?.labels?.length) return null
  const partial = d.partial ?? d.labels.map(() => false)
  if (monthlyRange.value === 'ytd') {
    const lastYear = d.months?.at(-1)?.year
    const keep = (d.months ?? [])
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.year === lastYear)
    return {
      labels: keep.map(({ m }) => m.label),
      values: keep.map(({ m }) => m.deaths),
      muted: keep.map(({ i }) => partial[i])
    }
  }
  const n = MONTHLY_RANGES.find((r) => r.key === monthlyRange.value)?.n ?? Infinity
  return { labels: tail(d.labels, n), values: tail(d.values, n), muted: tail(partial, n) }
})

// --- tables (always the full series) ---
const annualTable = computed(() => {
  const d = historical.data.value
  if (!d) return null
  return {
    columns: ['Year', 'Deaths', 'Crude rate', 'Age-adjusted rate', 'Provisional'],
    rows: d.years.map((y, i) => [
      y,
      d.totalDeaths[i],
      d.crudeRate?.[i] ?? '',
      d.ageAdjustedRate?.[i] ?? '',
      d.isProvisional[i] ? 'yes' : ''
    ]),
    note: `${d.years[0]}–${d.years.at(-1)} · rates per 100,000`
  }
})
const monthlyTable = computed(() => {
  const d = monthly.data.value
  if (!d?.months?.length) return null
  return {
    columns: ['Month', 'Deaths', 'Crude rate'],
    rows: d.months.map((m) => [m.label, m.deaths, m.crudeRate ?? '']),
    note: `${d.months[0].label}–${d.months.at(-1).label}`
  }
})
</script>

<template>
  <div>
    <PageHeader eyebrow="Mortality" title="Death Statistics Over Time" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <!-- Stat callouts -->
      <div v-if="latestYearDeaths != null || latestMonthDeaths != null" class="grid gap-4 sm:grid-cols-2">
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Deaths in {{ latestYear }}
            ({{ latestYearProvisional ? 'provisional' : 'most recent full year' }})
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {{ integerFormatter(latestYearDeaths) }}
          </dd>
        </div>
        <div v-if="latestMonthDeaths != null" class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Deaths in {{ latestMonthLabel }} (most recent month available)
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {{ integerFormatter(latestMonthDeaths) }}
          </dd>
        </div>
      </div>

      <!-- Annual historical section -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Annual Deaths</h2>
          <div class="flex flex-wrap items-center gap-3">
            <div v-if="annualYears.length" class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="(m, key) in ANNUAL_METRICS"
                :key="key"
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="metric === key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="metric = key"
              >
                {{ m.label }}
              </button>
            </div>
            <p v-if="annualYears.length" class="text-sm text-muted">
              {{ annualView?.labels[0] }}–{{ annualView?.labels.at(-1) }}
            </p>
            <RangeTabs
              v-if="annualYears.length"
              v-model="annualRange"
              :options="ANNUAL_RANGES"
              aria-label="Annual chart range"
            />
          </div>
        </div>

        <div v-if="historical.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>

        <div v-else-if="historical.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
            <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ historical.error.value }}</p>
          </details>
          <button type="button" class="btn-secondary mt-4" @click="historical.load">Try again</button>
        </div>

        <template v-else-if="annualView">
          <div class="card">
            <TimeSeriesChart
              :labels="annualView.labels"
              :values="annualView.values"
              :muted-points="annualView.muted"
              :series-label="ANNUAL_METRICS[metric].label"
              :value-formatter="metricFmt"
            />
            <ChartToolbar
              v-if="annualTable"
              :columns="annualTable.columns"
              :rows="annualTable.rows"
              :note="annualTable.note"
              filename="whywedie-annual-deaths"
            />
          </div>
          <p v-if="hasProvisional" class="mt-3 text-xs text-muted">
            The dashed, greyed segment ({{ firstProvisionalYear }} onward) is CDC provisional data from
            the Provisional Mortality database — close to final, but subject to small upward revision,
            and the most recent year may run a month or two short of a full year.
          </p>
          <p v-if="metric === 'ageAdjustedRate'" class="mt-1 text-xs text-muted">
            Age-adjusted to the 2000 US standard population, so years are comparable despite the
            population aging. Pre-1968 comes from CDC's historical series; before 1933 it covers the
            expanding death-registration area rather than every state. Raw death <em>counts</em> only
            go back to 1968 (no earlier source). 2021–2022 have no age-adjusted rate here yet — CDC's
            provisional all-cause row carries only a crude rate, and the rapid-release quarterly rate
            starts in 2023.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ historical.data.value.source }}.</p>
        </template>
      </section>

      <!-- Current monthly section -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Monthly Deaths</h2>
          <div class="flex items-center gap-3">
            <p v-if="monthlyView" class="text-sm text-muted">
              {{ monthlyView.labels[0] }}–{{ monthlyView.labels.at(-1) }}
            </p>
            <RangeTabs
              v-if="monthly.data.value?.labels?.length"
              v-model="monthlyRange"
              :options="MONTHLY_RANGES"
              aria-label="Monthly chart range"
            />
          </div>
        </div>

        <div v-if="monthly.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
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

        <div
          v-else-if="!monthly.data.value?.labels?.length"
          class="card text-sm text-muted"
        >
          Monthly figures aren't loaded yet — run the pipeline era
          <code class="text-ink">mortality --era=monthly</code>.
        </div>

        <template v-else-if="monthlyView">
          <div class="card">
            <TimeSeriesChart
              :labels="monthlyView.labels"
              :values="monthlyView.values"
              :muted-points="monthlyView.muted"
              muted-label="incomplete"
              series-label="Deaths"
              :value-formatter="integerFormatter"
            />
            <ChartToolbar
              v-if="monthlyTable"
              :columns="monthlyTable.columns"
              :rows="monthlyTable.rows"
              :note="monthlyTable.note"
              filename="whywedie-monthly-deaths"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            CDC provisional monthly counts (Provisional Mortality database).<template v-if="monthlyHasPartial">
              The dashed tail is the latest month or two still filling in — the count climbs as late
              records arrive.</template>
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ monthly.data.value.source }}.</p>
        </template>
      </section>
    </div>
  </div>
</template>
