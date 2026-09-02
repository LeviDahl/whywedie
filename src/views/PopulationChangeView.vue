<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchBirthsVsDeaths, fetchBirthHistory } from '@/api/populationChange.js'
import { sections } from '@/nav.js'

const route = useRoute()
const router = useRouter()

const section = sections.find((s) => s.name === 'population-change')

const bvd = useAsyncData(fetchBirthsVsDeaths)
const history = useAsyncData(fetchBirthHistory)

onMounted(() => {
  bvd.load()
  history.load()
})

const compact = (v) => {
  if (v == null) return '—'
  const a = Math.abs(v)
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return Math.round(v / 1e3) + 'K'
  return String(Math.round(v))
}
const full = (v) => (v == null ? '—' : v.toLocaleString())
const signed = (v) => (v == null ? '—' : (v >= 0 ? '+' : '−') + compact(Math.abs(v)))

// --- births vs deaths ---
const bvdSeries = computed(() => {
  const d = bvd.data.value
  if (!d) return []
  return [
    { label: 'Births', values: d.births },
    { label: 'Deaths', values: d.deaths }
  ]
})
const niSeries = computed(() => {
  const d = bvd.data.value
  return d ? [{ label: 'Natural increase', values: d.naturalIncrease }] : []
})
const first = computed(() => {
  const d = bvd.data.value
  if (!d?.years.length) return null
  return { year: d.years[0], ni: d.naturalIncrease[0] }
})
const last = computed(() => {
  const d = bvd.data.value
  if (!d?.years.length) return null
  const i = d.years.length - 1
  return { year: d.years[i], ni: d.naturalIncrease[i], births: d.births[i], deaths: d.deaths[i] }
})
const dropPct = computed(() => {
  if (!first.value || !last.value || !first.value.ni) return null
  return ((last.value.ni - first.value.ni) / first.value.ni) * 100
})

// --- long birth history: optional era-shape comparison ---
const ERA_PRESETS = [
  { label: 'Baby boom', from: 1946, to: 1964 },
  { label: 'Baby bust', from: 1965, to: 1976 },
  { label: 'Millennial echo', from: 1982, to: 1995 },
  { label: 'Since 2007', from: 2007, to: 2018 }
]
const eras = ref([])

// --- share the era selection via ?eras=1946-1964,2007-2018 ---
function parseEras(q) {
  return String(q || '')
    .split(',')
    .map((s) => s.match(/^(\d{4})-(\d{4})$/))
    .filter(Boolean)
    .map((m) => ({ from: Number(m[1]), to: Number(m[2]) }))
    .slice(0, 4)
}
eras.value = parseEras(route.query.eras)
watch(
  eras,
  (v) => {
    const q = v.map((e) => `${e.from}-${e.to}`).join(',')
    router.replace({ query: { ...route.query, eras: q || undefined } })
  },
  { deep: true }
)

function toggleEra(p) {
  const i = eras.value.findIndex((e) => e.from === p.from && e.to === p.to)
  if (i >= 0) eras.value.splice(i, 1)
  else if (eras.value.length < 4) eras.value.push({ from: p.from, to: p.to })
}
const eraActive = (p) => eras.value.some((e) => e.from === p.from && e.to === p.to)

const historyByYear = computed(() => {
  const d = history.data.value
  if (!d) return new Map()
  return new Map(d.years.map((y, i) => [y, d.births[i]]))
})

// When eras are chosen, re-plot each span aligned to "year 1" so their
// shapes sit on top of each other.
const eraOverlay = computed(() => {
  if (!eras.value.length) return null
  const map = historyByYear.value
  const maxLen = Math.max(...eras.value.map((e) => e.to - e.from + 1))
  return {
    labels: Array.from({ length: maxLen }, (_, i) => `Year ${i + 1}`),
    series: eras.value.map((e) => ({
      label: `${e.from}–${e.to}`,
      values: Array.from({ length: maxLen }, (_, i) => map.get(e.from + i) ?? null)
    }))
  }
})

// --- tables behind each chart ---
const bvdTable = computed(() => {
  const d = bvd.data.value
  if (!d) return null
  return {
    columns: ['Year', 'Births', 'Deaths', 'Natural increase'],
    rows: d.years.map((y, i) => [y, d.births[i], d.deaths[i], d.naturalIncrease[i]]),
    note: `${d.years[0]}–${d.years.at(-1)}`
  }
})
const historyTable = computed(() => {
  if (eraOverlay.value) {
    return {
      columns: ['Year in span', ...eraOverlay.value.series.map((s) => s.label)],
      rows: eraOverlay.value.labels.map((_, i) => [
        i + 1,
        ...eraOverlay.value.series.map((s) => s.values[i])
      ]),
      note: 'Aligned to year 1 of each span'
    }
  }
  const d = history.data.value
  if (!d) return null
  return {
    columns: ['Year', 'Births'],
    rows: d.years.map((y, i) => [y, d.births[i]]),
    note: `${d.years[0]}–${d.years.at(-1)}`
  }
})
</script>

<template>
  <div>
    <PageHeader eyebrow="Population" title="Population Decline / Gain" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <!-- Stat callouts -->
      <div v-if="last" class="grid gap-4 sm:grid-cols-3">
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Natural increase, {{ last.year }}
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{{ signed(last.ni) }}</dd>
          <dd class="mt-1 text-sm text-muted">{{ full(last.ni) }} more births than deaths</dd>
        </div>
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Natural increase, {{ first.year }}
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{{ signed(first.ni) }}</dd>
          <dd v-if="dropPct != null" class="mt-1 text-sm text-muted">
            {{ Math.round(Math.abs(dropPct)) }}% {{ dropPct < 0 ? 'smaller' : 'larger' }} by {{ last.year }}
          </dd>
        </div>
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">{{ last.year }} in full</dt>
          <dd class="mt-1.5 text-sm text-ink">
            <span class="font-semibold">{{ full(last.births) }}</span> births<br />
            <span class="font-semibold">{{ full(last.deaths) }}</span> deaths
          </dd>
        </div>
      </div>

      <!-- Births vs deaths -->
      <section>
        <div class="mb-4 flex items-baseline justify-between gap-4">
          <h2 class="text-base font-semibold text-ink">Births vs. Deaths</h2>
          <p v-if="bvd.data.value?.years?.length" class="text-sm text-muted">
            {{ bvd.data.value.years[0] }}–{{ bvd.data.value.years.at(-1) }}
          </p>
        </div>

        <div v-if="bvd.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>
        <div v-else-if="bvd.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
            <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ bvd.error.value }}</p>
          </details>
          <button type="button" class="btn-secondary mt-4" @click="bvd.load">Try again</button>
        </div>
        <template v-else-if="bvd.data.value?.years?.length">
          <div class="card">
            <TimeSeriesChart
              :labels="bvd.data.value.years"
              :series="bvdSeries"
              series-label="People"
              :value-formatter="compact"
            />
            <ChartToolbar
              v-if="bvdTable"
              :columns="bvdTable.columns"
              :rows="bvdTable.rows"
              :note="bvdTable.note"
              filename="whywedie-births-vs-deaths"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            The gap between the lines is <strong>natural increase</strong> — how much the population
            grows before any immigration. It has narrowed every decade shown.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ bvd.data.value.source }}.</p>
        </template>
      </section>

      <!-- Natural increase alone -->
      <section v-if="bvd.data.value?.years?.length">
        <h2 class="mb-4 text-base font-semibold text-ink">Natural Increase (Births − Deaths)</h2>
        <div class="card">
          <TimeSeriesChart
            :labels="bvd.data.value.years"
            :series="niSeries"
            series-label="Natural increase"
            :value-formatter="compact"
          />
          <ChartToolbar
            v-if="bvd.data.value"
            :columns="['Year', 'Natural increase']"
            :rows="bvd.data.value.years.map((y, i) => [y, bvd.data.value.naturalIncrease[i]])"
            :note="`${bvd.data.value.years[0]}–${bvd.data.value.years.at(-1)}`"
            :show-link="false"
            filename="whywedie-natural-increase"
          />
        </div>
        <p class="mt-3 text-xs text-muted">
          These datasets stop in 2017. Deaths first outnumbered births nationally in 2021 (COVID, an
          aging population, and falling fertility together) — extending this line needs the WONDER
          pipeline (a no-cause death total plus the natality databases).
        </p>
      </section>

      <!-- Long birth history -->
      <section>
        <div class="mb-4 flex items-baseline justify-between gap-4">
          <h2 class="text-base font-semibold text-ink">US Births per Year, the Long View</h2>
          <p v-if="history.data.value?.years?.length" class="text-sm text-muted">
            {{ history.data.value.years[0] }}–{{ history.data.value.years.at(-1) }}
          </p>
        </div>

        <div v-if="history.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>
        <div v-else-if="history.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <button type="button" class="btn-secondary mt-4" @click="history.load">Try again</button>
        </div>
        <template v-else-if="history.data.value?.years?.length">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Compare eras</span>
            <button
              v-for="p in ERA_PRESETS"
              :key="p.label"
              type="button"
              class="badge min-h-[34px] cursor-pointer px-3.5 py-1.5 transition-colors duration-150"
              :class="eraActive(p) ? 'border-ink bg-ink text-paper' : 'text-ink hover:border-ink'"
              @click="toggleEra(p)"
            >
              {{ p.label }}
            </button>
            <button
              v-if="eras.length"
              type="button"
              class="text-xs text-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
              @click="eras = []"
            >
              clear
            </button>
          </div>

          <div class="card">
            <TimeSeriesChart
              v-if="eraOverlay"
              :labels="eraOverlay.labels"
              :series="eraOverlay.series"
              :value-formatter="compact"
            />
            <TimeSeriesChart
              v-else
              :labels="history.data.value.years"
              :values="history.data.value.births"
              series-label="Births"
              :value-formatter="compact"
            />
            <ChartToolbar
              v-if="historyTable"
              :columns="historyTable.columns"
              :rows="historyTable.rows"
              :note="historyTable.note"
              filename="whywedie-us-births-history"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            <template v-if="eraOverlay">
              Each era is lined up from its first year, so you're comparing the <em>shape</em> — how
              fast births rose or fell — not the calendar.
            </template>
            <template v-else>
              The 1946–1964 baby boom, the 1970s "baby bust", the early-2000s echo, and the steady
              decline since 2007 are all visible here. Pick an era or two above to compare their
              shapes side by side.
            </template>
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ history.data.value.source }}.</p>
        </template>
      </section>
    </div>
  </div>
</template>
