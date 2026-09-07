<script setup>
// "Since you were born" — enter a year, get how many people have been
// born and have died in the US since then. Self-contained: pulls the
// annual all-cause deaths (1968+) and annual births (1960+) snapshots.
import { ref, computed, onMounted } from 'vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchHistoricalAnnualDeaths } from '@/api/historicalDeaths.js'
import { fetchAnnualNatality } from '@/api/natality.js'

const deaths = useAsyncData(fetchHistoricalAnnualDeaths)
const births = useAsyncData(fetchAnnualNatality)
onMounted(() => {
  deaths.load()
  births.load()
})

const DEATHS_FROM = 1968 // WONDER's earliest annual count
const BIRTHS_FROM = 1960

const latestYear = computed(() => {
  const d = deaths.data.value
  return d?.years?.length ? d.years.at(-1) : new Date().getFullYear() - 1
})
const year = ref(2000)

const result = computed(() => {
  const d = deaths.data.value
  const b = births.data.value
  if (!d?.years?.length || !b?.years?.length) return null
  const y = Math.min(Math.max(Math.round(year.value) || 0, DEATHS_FROM), latestYear.value)

  let deathSum = 0
  d.years.forEach((yr, i) => {
    if (yr >= y && d.totalDeaths[i] != null) deathSum += d.totalDeaths[i]
  })
  let birthSum = 0
  for (const yr of b.years) {
    if (yr >= Math.max(y, BIRTHS_FROM)) birthSum += b.byYear[yr]?.births ?? 0
  }
  return { from: y, deaths: deathSum, births: birthSum, capped: y !== Math.round(year.value) }
})

const fmt = (n) => {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`
  return Math.round(n).toLocaleString('en-US')
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline gap-2 text-sm text-ink">
      <label for="lifetime-year">Since the start of</label>
      <input
        id="lifetime-year"
        v-model.number="year"
        type="number"
        :min="DEATHS_FROM"
        :max="latestYear"
        inputmode="numeric"
        class="w-20 rounded-lg border border-line-strong bg-paper px-2 py-1 text-sm tabular-nums
               text-ink focus-visible:outline-2 focus-visible:outline-ink"
      />
    </div>

    <div v-if="result" class="mt-4 grid gap-4 sm:grid-cols-2">
      <div class="card">
        <dt class="text-xs font-medium uppercase tracking-wide text-muted">People born in the US</dt>
        <dd class="mt-1.5 text-3xl font-semibold tracking-tight text-ink">~{{ fmt(result.births) }}</dd>
      </div>
      <div class="card">
        <dt class="text-xs font-medium uppercase tracking-wide text-muted">People who have died</dt>
        <dd class="mt-1.5 text-3xl font-semibold tracking-tight text-ink">~{{ fmt(result.deaths) }}</dd>
      </div>
    </div>
    <p v-else class="mt-4 text-sm text-muted">Loading…</p>

    <p class="mt-3 text-xs text-muted">
      <template v-if="result?.capped">
        Counts run from {{ result.from }} (the earliest year with national figures) to
        {{ latestYear }}.
      </template>
      <template v-else>
        US totals, {{ result?.from }}–{{ latestYear }}. Births from
        <RouterLink to="/birth-statistics" class="link-underline">CDC + Census</RouterLink>,
        deaths from <RouterLink to="/death-statistics" class="link-underline">CDC WONDER</RouterLink>.
      </template>
      The most recent year is provisional.
    </p>
  </div>
</template>
