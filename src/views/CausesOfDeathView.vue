<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import RankedBarChart from '@/components/RankedBarChart.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchCausesOfDeath } from '@/api/causesOfDeath.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'causes-of-death')

const { data, error, loading, load } = useAsyncData(fetchCausesOfDeath)
onMounted(load)

// How many causes the ranked chart shows (of the ~50 NCHS rankable causes).
const TOP_N = 15

// deaths / age-adjusted rate / crude rate — the WONDER snapshot carries all
// three. Metric keys match the field names on each row so the charts can
// index rows with `row[metric]` directly.
const METRICS = {
  deaths: { label: 'Deaths', axis: 'Deaths', unit: 'deaths' },
  ageAdjustedRate: {
    label: 'Age-adjusted rate',
    axis: 'Age-adjusted rate (per 100,000)',
    unit: 'per 100,000 (age-adjusted)'
  },
  crudeRate: {
    label: 'Crude rate',
    axis: 'Crude rate (per 100,000)',
    unit: 'per 100,000'
  }
}
const metric = ref('deaths')
const selectedYear = ref(null)
const selectedCause = ref(null)

// Default to the most recent year and that year's #1 cause the first time
// data loads (won't stomp a choice the user's already made).
watch(
  data,
  (d) => {
    if (!d) return
    if (selectedYear.value == null) selectedYear.value = d.years.at(-1)
    if (selectedCause.value == null) {
      selectedCause.value = d.byYear[d.years.at(-1)]?.[0]?.cause ?? null
    }
  },
  { immediate: true }
)

const integerFormatter = (v) => (v == null ? '—' : Math.round(v).toLocaleString())
const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))
const valueFormatter = computed(() =>
  metric.value === 'deaths' ? integerFormatter : rateFormatter
)
const metricAxisLabel = computed(() => METRICS[metric.value].axis)
const metricUnit = computed(() => METRICS[metric.value].unit)

// --- Ranked breakdown for the selected year ---
const rankedRows = computed(() => {
  const rows = data.value?.byYear?.[selectedYear.value]
  if (!rows) return []
  return [...rows]
    .sort((a, b) => (b[metric.value] ?? -1) - (a[metric.value] ?? -1))
    .slice(0, TOP_N)
})
const rankedLabels = computed(() => rankedRows.value.map((r) => r.cause))
const rankedValues = computed(() => rankedRows.value.map((r) => r[metric.value]))
const topCause = computed(() => rankedRows.value[0] ?? null)

// --- Trend for the selected cause, across all years ---
const causeTrend = computed(() => data.value?.byCause?.[selectedCause.value] ?? null)
const trendLabels = computed(() => causeTrend.value?.years.map(String) ?? [])
const trendValues = computed(() => causeTrend.value?.[metric.value] ?? [])
</script>

<template>
  <div>
    <PageHeader eyebrow="Mortality" title="Causes of Death" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <div v-if="loading" class="card flex items-center justify-center py-20 text-sm text-muted">
        Loading…
      </div>

      <div v-else-if="error" class="card border-line-strong">
        <p class="text-sm font-semibold text-ink">Couldn't load this data</p>
        <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
          <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
          <p class="mt-2 whitespace-pre-wrap break-words">{{ error }}</p>
        </details>
        <button type="button" class="btn-secondary mt-4" @click="load">Try again</button>
      </div>

      <template v-else-if="data">
        <!-- Metric toggle — shared by both charts below -->
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs font-medium uppercase tracking-wide text-muted">Metric</span>
          <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
            <button
              v-for="(m, key) in METRICS"
              :key="key"
              type="button"
              class="px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
              :class="metric === key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
              @click="metric = key"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <!-- Stat callout -->
        <div v-if="topCause" class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Leading cause of death in {{ selectedYear }}
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{{ topCause.cause }}</dd>
          <dd class="mt-1 text-sm text-muted">
            {{ valueFormatter(topCause[metric]) }} {{ metricUnit }}
          </dd>
        </div>

        <!-- Ranked breakdown -->
        <section>
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-4">
            <h2 class="text-base font-semibold text-ink">Leading Causes, Ranked</h2>
            <label class="flex items-center gap-2 text-sm text-muted">
              Year
              <select
                v-model.number="selectedYear"
                class="rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink"
              >
                <option v-for="year in [...data.years].reverse()" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </label>
          </div>

          <div class="card">
            <RankedBarChart
              :labels="rankedLabels"
              :values="rankedValues"
              :series-label="metricAxisLabel"
              :value-formatter="valueFormatter"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            Top {{ TOP_N }} of the NCHS rankable ("113 Selected Causes") categories, national,
            {{ data.coverage.yearMin }}–{{ data.coverage.yearMax }}.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>

        <!-- Trend for one cause over time -->
        <section>
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-4">
            <h2 class="text-base font-semibold text-ink">Trend Over Time</h2>
            <label class="flex items-center gap-2 text-sm text-muted">
              Cause
              <select
                v-model="selectedCause"
                class="max-w-[16rem] rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink"
              >
                <option v-for="cause in data.causes" :key="cause" :value="cause">{{ cause }}</option>
              </select>
            </label>
          </div>

          <div class="card">
            <TimeSeriesChart
              :labels="trendLabels"
              :values="trendValues"
              :series-label="selectedCause"
              :value-formatter="valueFormatter"
            />
          </div>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>
      </template>
    </div>
  </div>
</template>
