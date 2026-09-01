<script setup>
import { computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchBirthsVsDeaths, fetchBirthHistory } from '@/api/populationChange.js'
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
          <div class="card">
            <TimeSeriesChart
              :labels="history.data.value.years"
              :values="history.data.value.births"
              series-label="Births"
              :value-formatter="compact"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            The 1946–1964 baby boom, the 1970s "baby bust", the early-2000s echo, and the steady
            decline since 2007 are all visible here.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ history.data.value.source }}.</p>
        </template>
      </section>
    </div>
  </div>
</template>
