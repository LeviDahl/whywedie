<script setup>
import { computed, ref, onMounted } from 'vue'
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
const annualValues = computed(() => annual.data.value?.[annualMetric.value] ?? [])

// Flag the most recent year(s) as provisional/partial: within a year of
// "now", or where the fertility rate hasn't landed yet. Renders muted on
// the chart. (Ready for the D192 provisional feed; today it just catches
// years whose rate/population came back empty.)
const thisYear = new Date().getFullYear()
const annualMuted = computed(() => {
  const d = annual.data.value
  if (!d) return []
  return d.years.map(
    (y) => y >= thisYear - 1 || (d.byYear[y]?.births != null && d.byYear[y]?.fertilityRate == null)
  )
})
const hasProvisional = computed(() => annualMuted.value.some(Boolean))

const ANNUAL_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '25y', label: '25 yr', n: 25 },
  { key: 'max', label: 'Max', n: Infinity }
]
const annualRange = ref('25y')
const annualView = computed(() => {
  const d = annual.data.value
  if (!d?.years?.length) return null
  const n = ANNUAL_RANGES.find((r) => r.key === annualRange.value)?.n ?? Infinity
  return {
    labels: tail(d.years, n),
    values: tail(annualValues.value, n),
    muted: tail(annualMuted.value, n)
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
          <div class="flex items-center gap-3">
            <p v-if="annualView" class="text-sm text-muted">
              {{ annualView.labels[0] }}–{{ annualView.labels.at(-1) }}
            </p>
            <RangeTabs
              v-if="annual.data.value?.years?.length"
              v-model="annualRange"
              :options="ANNUAL_RANGES"
              aria-label="Annual births range"
            />
          </div>
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
          <div class="mb-4 inline-flex overflow-hidden rounded-lg border border-line-strong">
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

          <div class="card">
            <TimeSeriesChart
              :labels="annualView.labels"
              :values="annualView.values"
              :muted-points="annualView.muted"
              :series-label="ANNUAL_METRICS[annualMetric].axis"
              :value-formatter="annualFmt"
            />
            <ChartToolbar
              v-if="annualTable"
              :columns="annualTable.columns"
              :rows="annualTable.rows"
              :note="annualTable.note"
              filename="whywedie-annual-births"
            />
          </div>
          <p v-if="hasProvisional" class="mt-3 text-xs text-muted">
            The dashed, greyed tail is provisional — the most recent year's rate and population figures
            aren't final yet.
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
