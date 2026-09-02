<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import RangeTabs from '@/components/RangeTabs.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchBirthsVsDeaths, fetchBirthHistory } from '@/api/populationChange.js'
import { PEW_GENERATIONS, generationChoices } from '@/data/generations.js'
import { sections } from '@/nav.js'

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
const tail = (arr, n) => (n === Infinity ? (arr ?? []).slice() : (arr ?? []).slice(Math.max(0, arr.length - n)))

const BVD_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '20y', label: '20 yr', n: 20 },
  { key: 'max', label: 'Max', n: Infinity }
]
const bvdRange = ref('max')
const bvdCut = computed(() => BVD_RANGES.find((r) => r.key === bvdRange.value)?.n ?? Infinity)

// Sliced-to-range view of the births/deaths/natural-increase series.
const bvdWindow = computed(() => {
  const d = bvd.data.value
  if (!d?.years?.length) return null
  const n = bvdCut.value
  return {
    years: tail(d.years, n),
    births: tail(d.births, n),
    deaths: tail(d.deaths, n),
    naturalIncrease: tail(d.naturalIncrease, n),
    provisional: tail(d.provisional, n)
  }
})

// Deaths (and therefore natural increase) are provisional from 2021 on;
// births in those years are already final — only dash the affected lines.
const bvdSeries = computed(() => {
  const w = bvdWindow.value
  if (!w) return []
  return [
    { label: 'Births', values: w.births },
    { label: 'Deaths', values: w.deaths, muted: w.provisional }
  ]
})
const niSeries = computed(() => {
  const w = bvdWindow.value
  return w ? [{ label: 'Natural increase', values: w.naturalIncrease, muted: w.provisional }] : []
})
const hasProvisional = computed(() => bvd.data.value?.provisional?.some(Boolean))
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
// Low point of natural increase (the year the gap came closest to closing).
const trough = computed(() => {
  const d = bvd.data.value
  if (!d?.years.length) return null
  let i = 0
  for (let k = 1; k < d.naturalIncrease.length; k++) {
    if (d.naturalIncrease[k] < d.naturalIncrease[i]) i = k
  }
  return { year: d.years[i], ni: d.naturalIncrease[i] }
})
const dropPct = computed(() => {
  if (!first.value || !last.value || !first.value.ni) return null
  return ((last.value.ni - first.value.ni) / first.value.ni) * 100
})

// --- long birth history: Pew generation bands + drill-down ---
// One selector drives the window: a numeric range key OR a cohort label.
const HISTORY_RANGES = [
  { key: '40y', label: '40 yr', n: 40 },
  { key: '80y', label: '80 yr', n: 80 },
  { key: 'max', label: 'Max', n: Infinity }
]
const showGenerations = ref(true)
const historyWindowKey = ref('max')
const historySpan = computed(() => {
  const ys = history.data.value?.years ?? []
  return ys.length ? [ys[0], ys[ys.length - 1]] : [1909, 2026]
})
const GEN_CHOICES = computed(() => generationChoices(...historySpan.value))
const selectedGen = computed(
  () => PEW_GENERATIONS.find((g) => g.label === historyWindowKey.value) ?? null
)
function pickHistoryWindow(key) {
  historyWindowKey.value = key
}
function onHistoryBandClick(band) {
  if (!showGenerations.value) return
  historyWindowKey.value = historyWindowKey.value === band.label ? 'max' : band.label
}
watch(showGenerations, (on) => {
  if (!on && selectedGen.value) historyWindowKey.value = 'max'
})
const historyBands = computed(() =>
  showGenerations.value
    ? PEW_GENERATIONS.map((g) => ({ ...g, active: g.label === historyWindowKey.value }))
    : []
)

const historyView = computed(() => {
  const d = history.data.value
  if (!d?.years?.length) return null
  const g = showGenerations.value ? selectedGen.value : null
  if (g) {
    const keep = d.years.map((y) => y >= g.from && y <= g.to)
    return { years: d.years.filter((_, i) => keep[i]), births: d.births.filter((_, i) => keep[i]) }
  }
  const n = HISTORY_RANGES.find((r) => r.key === historyWindowKey.value)?.n ?? Infinity
  return { years: tail(d.years, n), births: tail(d.births, n) }
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
  const v = historyView.value
  if (!v) return null
  return {
    columns: ['Year', 'Births'],
    rows: v.years.map((y, i) => [y, v.births[i]]),
    note: `${v.years[0]}–${v.years.at(-1)}`
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
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Births vs. Deaths</h2>
          <div class="flex items-center gap-3">
            <p v-if="bvdWindow" class="text-sm text-muted">
              {{ bvdWindow.years[0] }}–{{ bvdWindow.years.at(-1) }}
            </p>
            <RangeTabs
              v-if="bvd.data.value?.years?.length"
              v-model="bvdRange"
              :options="BVD_RANGES"
              aria-label="Births vs deaths range"
            />
          </div>
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
        <template v-else-if="bvdWindow">
          <div class="card">
            <TimeSeriesChart
              :labels="bvdWindow.years"
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
            grows before any immigration. It has narrowed almost every year since 1999.
          </p>
          <p v-if="hasProvisional" class="mt-1 text-xs text-muted">
            The greyed deaths tail (2021+) is CDC provisional data.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ bvd.data.value.source }}.</p>
        </template>
      </section>

      <!-- Natural increase alone -->
      <section v-if="bvdWindow">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Natural Increase (Births − Deaths)</h2>
          <RangeTabs
            v-if="bvd.data.value?.years?.length"
            v-model="bvdRange"
            :options="BVD_RANGES"
            aria-label="Natural increase range"
          />
        </div>
        <div class="card">
          <TimeSeriesChart
            :labels="bvdWindow.years"
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
        <p v-if="trough" class="mt-3 text-xs text-muted">
          The margin came closest to closing in <strong>{{ trough.year }}</strong> ({{ signed(trough.ni) }}) —
          COVID deaths, an aging population, and falling fertility all at once — then widened again as
          the pandemic receded.
        </p>
      </section>

      <!-- Long birth history -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">US Births per Year, the Long View</h2>
          <p v-if="historyView" class="text-sm text-muted">
            {{ historyView.years[0] }}–{{ historyView.years.at(-1) }}
          </p>
        </div>

        <div v-if="history.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>
        <div v-else-if="history.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <button type="button" class="btn-secondary mt-4" @click="history.load">Try again</button>
        </div>
        <template v-else-if="historyView">
          <div class="mb-4 flex flex-wrap items-center gap-3">
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

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Show</span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="r in HISTORY_RANGES"
                :key="r.key"
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="historyWindowKey === r.key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="pickHistoryWindow(r.key)"
              >
                {{ r.label }}
              </button>
            </div>
            <div v-if="showGenerations" class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="g in GEN_CHOICES"
                :key="g.label"
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="historyWindowKey === g.label ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="pickHistoryWindow(g.label)"
              >
                {{ g.label }}
              </button>
            </div>
          </div>

          <div class="card">
            <TimeSeriesChart
              :labels="historyView.years"
              :values="historyView.births"
              :bands="historyBands"
              series-label="Births"
              :value-formatter="compact"
              @band-click="onHistoryBandClick"
            />
            <ChartToolbar
              v-if="historyTable"
              :columns="historyTable.columns"
              :rows="historyTable.rows"
              :note="historyTable.note"
              filename="whywedie-us-births-history"
            />
          </div>
          <p v-if="showGenerations" class="mt-3 text-xs text-muted">
            Shaded bands are the <a class="link-underline" href="https://www.pewresearch.org/short-reads/2019/01/17/where-millennials-end-and-generation-z-begins/" target="_blank" rel="noopener">Pew Research Center</a>
            generation cutoffs by birth year. Click a band — or a cohort button above — to zoom to
            just those years; <em>Generations: Off</em> hides them. The 1946–1964 baby boom, the
            1970s "baby bust", and the decline since 2007 are all visible here.
          </p>
          <p v-else class="mt-3 text-xs text-muted">
            The 1946–1964 baby boom, the 1970s "baby bust", the early-2000s echo, and the steady
            decline since 2007 are all visible here.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ history.data.value.source }}.</p>
        </template>
      </section>
    </div>
  </div>
</template>
