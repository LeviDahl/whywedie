<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import RankedBarChart from '@/components/RankedBarChart.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { useNamePreference } from '@/composables/useNamePreference.js'
import { fetchCausesOfDeath } from '@/api/causesOfDeath.js'
import { displayName } from '@/data/causeNames.js'
import { SERIES } from '@/charts/palette.js'
import { sections } from '@/nav.js'

const route = useRoute()
const router = useRouter()
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const section = sections.find((s) => s.name === 'causes-of-death')

// Friendly vs official cause names (persisted, shared app-wide).
const { nameStyle } = useNamePreference()
const label = (officialName) => displayName(officialName, nameStyle.value)

const { data, error, loading, load } = useAsyncData(fetchCausesOfDeath)
onMounted(load)

const TOP_N = 15
const MAX_PERIODS = 4
const MAX_TREND_CAUSES = 4
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020]

// deaths / age-adjusted rate / crude rate — keys match the row field names
// so charts can index rows with row[metric] directly.
const METRICS = {
  deaths: { label: 'Deaths', axis: 'Deaths (mean/yr)', unit: 'deaths/yr' },
  ageAdjustedRate: {
    label: 'Age-adjusted rate',
    axis: 'Age-adjusted rate (per 100,000)',
    unit: 'per 100,000 (age-adjusted)'
  },
  crudeRate: { label: 'Crude rate', axis: 'Crude rate (per 100,000)', unit: 'per 100,000' }
}
const metric = ref(METRICS[route.query.metric] ? route.query.metric : 'deaths')
if (route.query.names === 'friendly' || route.query.names === 'official') {
  nameStyle.value = route.query.names
}

// Ranked chart: one series per "period" (a single year or a year range).
const periods = ref([])
// Trend chart: one line per selected cause.
const trendCauses = ref([])

function parsePeriodsParam(q, years) {
  const lo = years[0]
  const hi = years.at(-1)
  const clamp = (n) => Math.min(hi, Math.max(lo, n))
  return String(q || '')
    .split(',')
    .map((s) => s.match(/^(\d{4})(?:-(\d{4}))?$/))
    .filter(Boolean)
    .map((m) => ({ from: clamp(+m[1]), to: clamp(+(m[2] || m[1])) }))
    .slice(0, MAX_PERIODS)
}

watch(
  data,
  (d) => {
    if (!d) return
    if (periods.value.length === 0) {
      periods.value =
        parsePeriodsParam(route.query.periods, d.years).length
          ? parsePeriodsParam(route.query.periods, d.years)
          : [{ from: d.years.at(-1), to: d.years.at(-1) }]
    }
    if (trendCauses.value.length === 0) {
      const wanted = String(route.query.causes || '')
        .split(',')
        .filter(Boolean)
      const bySlug = new Map(d.causes.map((c) => [slug(c), c]))
      const fromUrl = wanted.map((s) => bySlug.get(s)).filter(Boolean).slice(0, MAX_TREND_CAUSES)
      trendCauses.value = fromUrl.length
        ? fromUrl
        : [d.byYear[d.years.at(-1)]?.[0]?.cause].filter(Boolean)
    }
  },
  { immediate: true }
)

// Reflect the current view in the URL so "Copy link" is shareable.
watch(
  [metric, nameStyle, periods, trendCauses],
  ([m, n, ps, cs]) => {
    router.replace({
      query: {
        ...route.query,
        metric: m === 'deaths' ? undefined : m,
        names: n === 'friendly' ? undefined : n,
        periods:
          ps.map((p) => (p.from === p.to ? `${p.from}` : `${p.from}-${p.to}`)).join(',') || undefined,
        causes: cs.map(slug).join(',') || undefined
      }
    })
  },
  { deep: true }
)

const integerFormatter = (v) => (v == null ? '—' : Math.round(v).toLocaleString())
const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))
const valueFormatter = computed(() =>
  metric.value === 'deaths' ? integerFormatter : rateFormatter
)
const metricAxisLabel = computed(() => METRICS[metric.value].axis)
const metricUnit = computed(() => METRICS[metric.value].unit)

// --- periods ---------------------------------------------------------
const periodLabel = (p) => (p.from === p.to ? `${p.from}` : `${p.from}–${p.to}`)

function yearsIn(p) {
  const lo = Math.min(p.from, p.to)
  const hi = Math.max(p.from, p.to)
  return (data.value?.years ?? []).filter((y) => y >= lo && y <= hi)
}

// cause name -> mean of the selected metric across the period's years
function meansForPeriod(p) {
  const acc = new Map()
  for (const y of yearsIn(p)) {
    for (const row of data.value.byYear[y] ?? []) {
      const v = row[metric.value]
      if (v == null) continue
      const a = acc.get(row.cause) ?? { sum: 0, n: 0 }
      a.sum += v
      a.n += 1
      acc.set(row.cause, a)
    }
  }
  const out = new Map()
  for (const [name, a] of acc) out.set(name, a.n ? a.sum / a.n : null)
  return out
}

const periodMeans = computed(() => (data.value ? periods.value.map(meansForPeriod) : []))

// Causes ranked by the primary (first) period — the same set is shown for
// every period so the comparison lines up row-for-row.
const rankedCauseNames = computed(() => {
  const primary = periodMeans.value[0]
  if (!primary) return []
  return [...primary.entries()]
    .sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1))
    .slice(0, TOP_N)
    .map(([name]) => name)
})

// Chart y-axis labels — display names; data below stays keyed by the
// official name.
const rankedLabels = computed(() => rankedCauseNames.value.map(label))

const rankedSeries = computed(() =>
  periods.value.map((p, i) => ({
    label: periodLabel(p),
    values: rankedCauseNames.value.map((name) => periodMeans.value[i]?.get(name) ?? null)
  }))
)

const primaryTop = computed(() => {
  const name = rankedCauseNames.value[0]
  if (!name) return null
  return { cause: name, value: periodMeans.value[0]?.get(name) ?? null }
})

const decadeButtons = computed(() => {
  const lo = data.value?.years[0] ?? Infinity
  const hi = data.value?.years.at(-1) ?? -Infinity
  return DECADES.map((d) => {
    const from = Math.max(d, lo)
    const to = Math.min(d + 9, hi)
    return { key: d, label: `${d}s`, from, to, available: from <= to }
  })
})

function addPeriodFromDecade(b) {
  if (!b.available || periods.value.length >= MAX_PERIODS) return
  if (periods.value.some((p) => p.from === b.from && p.to === b.to)) return
  periods.value.push({ from: b.from, to: b.to })
}

function addPeriod() {
  if (periods.value.length >= MAX_PERIODS) return
  const lo = data.value.years[0]
  const earliest = Math.min(...periods.value.flatMap((p) => [p.from, p.to]))
  const to = Math.max(lo, earliest - 1)
  const from = Math.max(lo, to - 9)
  periods.value.push({ from, to })
}

function removePeriod(i) {
  periods.value.splice(i, 1)
}

// --- trend ----------------------------------------------------------
const availableTrendCauses = computed(() =>
  (data.value?.causes ?? [])
    .filter((c) => !trendCauses.value.includes(c))
    .sort((a, b) => label(a).localeCompare(label(b)))
)

const trendSeries = computed(() =>
  trendCauses.value
    .filter((name) => data.value?.byCause[name])
    .map((name) => ({ label: label(name), values: data.value.byCause[name][metric.value] }))
)
const trendYearLabels = computed(() => data.value?.years.map(String) ?? [])

// --- tables behind the two charts ---
const rankedTable = computed(() => {
  if (!rankedCauseNames.value.length) return null
  return {
    columns: ['Cause', ...periods.value.map(periodLabel)],
    rows: rankedCauseNames.value.map((name) => [
      label(name),
      ...periodMeans.value.map((m) => {
        const v = m?.get(name)
        return v == null ? '' : Math.round(v * 100) / 100
      })
    ]),
    note: `${METRICS[metric.value].label} · mean annual value per period`
  }
})
const trendTable = computed(() => {
  if (!data.value || !trendCauses.value.length) return null
  return {
    columns: ['Year', ...trendCauses.value.map(label)],
    rows: data.value.years.map((y, i) => [
      y,
      ...trendCauses.value.map((name) => {
        const v = data.value.byCause[name]?.[metric.value]?.[i]
        return v == null ? '' : v
      })
    ]),
    note: `${METRICS[metric.value].label} · ${data.value.coverage.yearMin}–${data.value.coverage.yearMax}`
  }
})

function addTrendCause(name) {
  if (name && trendCauses.value.length < MAX_TREND_CAUSES && !trendCauses.value.includes(name)) {
    trendCauses.value.push(name)
  }
}
function onAddCauseSelect(event) {
  addTrendCause(event.target.value)
  event.target.selectedIndex = 0
}
function removeTrendCause(i) {
  trendCauses.value.splice(i, 1)
}
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
        <!-- Controls — shared by both charts below -->
        <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
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

          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Names</span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="opt in ['friendly', 'official']"
                :key="opt"
                type="button"
                class="px-3.5 py-1.5 text-sm font-medium capitalize transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="nameStyle === opt ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="nameStyle = opt"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stat callout -->
        <div v-if="primaryTop" class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Leading cause of death, {{ periodLabel(periods[0]) }}
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{{ label(primaryTop.cause) }}</dd>
          <dd class="mt-1 text-sm text-muted">
            {{ valueFormatter(primaryTop.value) }} {{ metricUnit }}
          </dd>
        </div>

        <!-- Ranked breakdown, with period comparison -->
        <section>
          <h2 class="mb-4 text-base font-semibold text-ink">Leading Causes, Ranked</h2>

          <!-- period controls -->
          <div class="mb-5 space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Add decade</span>
              <button
                v-for="b in decadeButtons"
                :key="b.key"
                type="button"
                class="badge min-h-[34px] px-3.5 py-1.5 transition-colors duration-150"
                :class="
                  b.available
                    ? 'cursor-pointer text-ink hover:border-ink'
                    : 'cursor-not-allowed opacity-40'
                "
                :disabled="!b.available || periods.length >= MAX_PERIODS"
                :title="b.available ? '' : 'Needs the ICD-9 / ICD-8 pipeline (pre-1999)'"
                @click="addPeriodFromDecade(b)"
              >
                {{ b.label }}
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Periods</span>
              <div
                v-for="(p, i) in periods"
                :key="i"
                class="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper py-1.5 pl-2 pr-1 text-sm"
              >
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: SERIES[i % SERIES.length] }"
                  aria-hidden="true"
                ></span>
                <select
                  v-model.number="p.from"
                  class="min-h-[28px] bg-transparent py-0.5 text-ink focus-visible:outline-none"
                  aria-label="Period start year"
                >
                  <option v-for="y in data.years" :key="y" :value="y">{{ y }}</option>
                </select>
                <span class="text-muted">–</span>
                <select
                  v-model.number="p.to"
                  class="min-h-[28px] bg-transparent py-0.5 text-ink focus-visible:outline-none"
                  aria-label="Period end year"
                >
                  <option v-for="y in data.years" :key="y" :value="y">{{ y }}</option>
                </select>
                <button
                  v-if="periods.length > 1"
                  type="button"
                  class="ml-1 rounded px-2 py-1 text-muted hover:bg-paper-soft hover:text-ink"
                  aria-label="Remove period"
                  @click="removePeriod(i)"
                >
                  ×
                </button>
              </div>
              <button
                type="button"
                class="btn-secondary px-2.5 py-1 text-xs"
                :disabled="periods.length >= MAX_PERIODS"
                @click="addPeriod"
              >
                + Add period
              </button>
            </div>
          </div>

          <div class="card">
            <RankedBarChart
              :labels="rankedLabels"
              :series="rankedSeries"
              :value-formatter="valueFormatter"
            />
            <ChartToolbar
              v-if="rankedTable"
              :columns="rankedTable.columns"
              :rows="rankedTable.rows"
              :note="rankedTable.note"
              filename="whywedie-leading-causes"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            Top {{ TOP_N }} rankable ("113 Selected Causes") categories by {{ periodLabel(periods[0]) }},
            shown as the mean annual value for each period. National,
            {{ data.coverage.yearMin }}–{{ data.coverage.yearMax }} — earlier decades unlock when the
            ICD-9 / ICD-8 pipelines are built.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>

        <!-- Trend for one or more causes over time -->
        <section>
          <h2 class="mb-4 text-base font-semibold text-ink">Trend Over Time</h2>

          <div class="mb-5 flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Causes</span>
            <span
              v-for="(name, i) in trendCauses"
              :key="name"
              class="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper py-1.5 pl-2.5 pr-1 text-sm text-ink"
            >
              <span
                class="size-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: SERIES[i % SERIES.length] }"
                aria-hidden="true"
              ></span>
              {{ label(name) }}
              <button
                v-if="trendCauses.length > 1"
                type="button"
                class="rounded px-2 py-1 text-muted hover:bg-paper-soft hover:text-ink"
                aria-label="Remove cause"
                @click="removeTrendCause(i)"
              >
                ×
              </button>
            </span>
            <select
              v-if="trendCauses.length < MAX_TREND_CAUSES && availableTrendCauses.length"
              class="max-w-[15rem] rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink"
              @change="onAddCauseSelect"
            >
              <option value="">+ Add cause…</option>
              <option v-for="c in availableTrendCauses" :key="c" :value="c">{{ label(c) }}</option>
            </select>
          </div>

          <div class="card">
            <TimeSeriesChart
              :labels="trendYearLabels"
              :series="trendSeries"
              :value-formatter="valueFormatter"
            />
            <ChartToolbar
              v-if="trendTable"
              :columns="trendTable.columns"
              :rows="trendTable.rows"
              :note="trendTable.note"
              filename="whywedie-cause-trend"
            />
          </div>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>
      </template>
    </div>
  </div>
</template>
