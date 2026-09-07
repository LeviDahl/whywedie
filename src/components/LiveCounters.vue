<script setup>
// Worldometers-style projected counters for US births / deaths / net
// change: an annual figure spread evenly across the clock. NOT a live
// feed — it's `perYear × (time elapsed / period length)`, recomputed from
// the real wall clock each animation frame so it stays accurate rather
// than drifting. Reset points are local midnight and local Jan 1.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  birthsPerYear: { type: Number, required: true },
  deathsPerYear: { type: Number, required: true },
  // e.g. "the 12 months ending June 2026" — shown in the caption.
  periodLabel: { type: String, default: '' },
  // compact = "so far today" row only, terser caption (for the home page).
  compact: { type: Boolean, default: false }
})

const DAY_MS = 86_400_000

function yearBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1).getTime()
  const end = new Date(d.getFullYear() + 1, 0, 1).getTime()
  return { start, end, length: end - start }
}
function dayStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

// 4 Hz is plenty — the counters tick slower than once a second — and it
// keeps Vue from re-rendering every animation frame.
const now = ref(Date.now())
let timer = 0
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 250) })
onBeforeUnmount(() => clearInterval(timer))

const fracToday = computed(() => {
  const t = now.value
  return Math.min(1, (t - dayStart(new Date(t))) / DAY_MS)
})
const fracYear = computed(() => {
  const t = now.value
  const { start, length } = yearBounds(new Date(t))
  return Math.min(1, (t - start) / length)
})
const thisYear = computed(() => new Date(now.value).getFullYear())

const int = (n) => Math.floor(n).toLocaleString('en-US')
const signedInt = (n) => (n >= 0 ? '+' : '−') + Math.floor(Math.abs(n)).toLocaleString('en-US')

// per-day rate (annual ÷ 365) × how much of today has elapsed
const today = computed(() => ({
  births: (props.birthsPerYear / 365) * fracToday.value,
  deaths: (props.deathsPerYear / 365) * fracToday.value,
  net: ((props.birthsPerYear - props.deathsPerYear) / 365) * fracToday.value
}))
const yearToDate = computed(() => ({
  births: props.birthsPerYear * fracYear.value,
  deaths: props.deathsPerYear * fracYear.value,
  net: (props.birthsPerYear - props.deathsPerYear) * fracYear.value
}))

// "one every N seconds" — the punchy line.
const secsPerBirth = computed(() => Math.round((365 * DAY_MS) / props.birthsPerYear / 1000))
const secsPerDeath = computed(() => Math.round((365 * DAY_MS) / props.deathsPerYear / 1000))

const rows = computed(() => {
  const all = [
    { key: 'today', label: 'So far today', v: today.value },
    { key: 'ytd', label: `So far in ${thisYear.value}`, v: yearToDate.value }
  ]
  return props.compact ? all.slice(0, 1) : all
})
</script>

<template>
  <div class="space-y-6">
    <div v-for="row in rows" :key="row.key">
      <p v-if="!compact" class="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        {{ row.label }}
      </p>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Births</dt>
          <dd class="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {{ int(row.v.births) }}
          </dd>
        </div>
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Deaths</dt>
          <dd class="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {{ int(row.v.deaths) }}
          </dd>
        </div>
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Net change</dt>
          <dd class="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {{ signedInt(row.v.net) }}
          </dd>
        </div>
      </div>
    </div>

    <p class="text-xs leading-relaxed text-muted">
      <template v-if="compact">
        Roughly one US birth every {{ secsPerBirth }} seconds, one death every
        {{ secsPerDeath }} — the latest 12-month totals spread evenly across the clock, a
        projection, <strong class="font-semibold text-ink">not a live feed</strong>.
      </template>
      <template v-else>
        Roughly one US birth every {{ secsPerBirth }} seconds and one death every
        {{ secsPerDeath }} seconds. These counters spread the latest 12-month totals<template
          v-if="periodLabel"
        >
          ({{ periodLabel }})</template>
        evenly across the clock — a projection for scale, <strong class="font-semibold text-ink">not
        a live feed</strong>. They reset at local midnight and on 1 January.
      </template>
    </p>
  </div>
</template>
