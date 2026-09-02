<script setup>
import { computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchHistoricalAnnualDeaths } from '@/api/historicalDeaths.js'
import { fetchCurrentMonthlyDeaths } from '@/api/currentVitalEvents.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'death-statistics')

const historical = useAsyncData(fetchHistoricalAnnualDeaths)
const monthly = useAsyncData(fetchCurrentMonthlyDeaths)

onMounted(() => {
  historical.load()
  monthly.load()
})

const integerFormatter = (v) => (v == null ? '—' : v.toLocaleString())

// --- Historical annual (1999–present; 2021+ are CDC provisional) ---
const latestIndex = computed(() => {
  const n = historical.data.value?.years?.length ?? 0
  return n ? n - 1 : -1
})
const latestYear = computed(() =>
  latestIndex.value >= 0 ? historical.data.value.years[latestIndex.value] : null
)
const latestYearDeaths = computed(() =>
  latestIndex.value >= 0 ? historical.data.value.totalDeaths[latestIndex.value] : null
)
const latestYearProvisional = computed(() =>
  latestIndex.value >= 0 ? Boolean(historical.data.value.isProvisional[latestIndex.value]) : false
)
const hasProvisional = computed(() => historical.data.value?.isProvisional?.some(Boolean))
const firstProvisionalYear = computed(() => {
  const d = historical.data.value
  if (!d) return null
  const i = d.isProvisional.findIndex(Boolean)
  return i === -1 ? null : d.years[i]
})

// --- Current monthly ---
const latestMonthIndex = computed(() => (monthly.data.value?.labels?.length ? monthly.data.value.labels.length - 1 : -1))
const latestMonthLabel = computed(() => (latestMonthIndex.value >= 0 ? monthly.data.value.labels[latestMonthIndex.value] : null))
const latestMonthDeaths = computed(() => (latestMonthIndex.value >= 0 ? monthly.data.value.values[latestMonthIndex.value] : null))

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
    note: `${d.years[0]}–${d.years.at(-1)} · per 100,000`
  }
})
const monthlyTable = computed(() => {
  const d = monthly.data.value
  if (!d) return null
  return {
    columns: ['Month', 'Deaths'],
    rows: d.labels.map((m, i) => [m, d.values[i]]),
    note: `Data through ${d.labels.at(-1)}`
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
        <div class="card">
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
        <div class="mb-4 flex items-baseline justify-between gap-4">
          <h2 class="text-base font-semibold text-ink">Annual Deaths</h2>
          <p v-if="historical.data.value?.years?.length" class="text-sm text-muted">
            {{ historical.data.value.years[0] }}–{{ historical.data.value.years.at(-1) }}
          </p>
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

        <template v-else-if="historical.data.value?.years?.length">
          <div class="card">
            <TimeSeriesChart
              :labels="historical.data.value.years"
              :values="historical.data.value.totalDeaths"
              :muted-points="historical.data.value.isProvisional"
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
        <div class="mb-4 flex items-baseline justify-between gap-4">
          <h2 class="text-base font-semibold text-ink">Monthly Deaths (Current)</h2>
          <p v-if="monthly.data.value?.labels?.length" class="text-sm text-muted">
            {{ monthly.data.value.labels[0] }}–{{ monthly.data.value.labels.at(-1) }}
          </p>
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

        <template v-else-if="monthly.data.value?.labels?.length">
          <div class="card">
            <TimeSeriesChart
              :labels="monthly.data.value.labels"
              :values="monthly.data.value.values"
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
            This is CDC's provisional monthly release, published on a quarterly cycle — it won't always reach up to
            the present month. {{ latestMonthLabel }} is the most recent month CDC has published as of this data
            pull.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ monthly.data.value.source }}.</p>
        </template>
      </section>
    </div>
  </div>
</template>
