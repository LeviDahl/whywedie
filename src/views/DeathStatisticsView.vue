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

// --- Historical annual (1999–present; 2021+ are CDC provisional) ---
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

// --- Current monthly ---
const latestMonthLabel = computed(() => monthly.data.value?.labels?.at(-1) ?? null)
const latestMonthDeaths = computed(() => monthly.data.value?.values?.at(-1) ?? null)

// --- time-range windows -------------------------------------------------
const ANNUAL_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '20y', label: '20 yr', n: 20 },
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
  const n = ANNUAL_RANGES.find((r) => r.key === annualRange.value)?.n ?? Infinity
  return {
    labels: tail(d.years, n),
    values: tail(d.totalDeaths, n),
    muted: tail(d.isProvisional, n)
  }
})

const monthlyView = computed(() => {
  const d = monthly.data.value
  if (!d?.labels?.length) return null
  if (monthlyRange.value === 'ytd') {
    const lastYear = d.months?.at(-1)?.year
    const keep = (d.months ?? []).filter((m) => m.year === lastYear)
    return { labels: keep.map((m) => m.label), values: keep.map((m) => m.deaths) }
  }
  const n = MONTHLY_RANGES.find((r) => r.key === monthlyRange.value)?.n ?? Infinity
  return { labels: tail(d.labels, n), values: tail(d.values, n) }
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
          <div class="flex items-center gap-3">
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
              series-label="Deaths"
              :value-formatter="integerFormatter"
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
            Lighter points ({{ firstProvisionalYear }} onward) are CDC provisional counts from the
            Provisional Mortality database — close to final, but subject to small upward revision, and
            the most recent year may run a month or two short of a full year.
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
            CDC provisional monthly counts (Provisional Mortality database). The most recent month or
            two may still be filling in, so the tail can tick up as late records arrive.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ monthly.data.value.source }}.</p>
        </template>
      </section>
    </div>
  </div>
</template>
