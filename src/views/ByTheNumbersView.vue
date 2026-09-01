<script setup>
import { computed, ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchDailyPace } from '@/api/dailyStats.js'
import { perDay, pickFacts } from '@/data/dailyFacts.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'by-the-numbers')

const { data, error, loading, load } = useAsyncData(fetchDailyPace)
onMounted(load)

// Human-readable rounding: big numbers → "8.2 million", mid → nearest 100.
function human(n) {
  if (n == null) return '—'
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' billion'
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' million'
  if (a >= 1e4) return Math.round(n / 100) * 100 === n ? n.toLocaleString() : (Math.round(n / 100) * 100).toLocaleString()
  return Math.round(n).toLocaleString()
}

const birthsPerDay = computed(() => (data.value ? data.value.birthsPerYear / 365 : null))
const deathsPerDay = computed(() => (data.value ? data.value.deathsPerYear / 365 : null))
const netPerDay = computed(() =>
  data.value ? (data.value.birthsPerYear - data.value.deathsPerYear) / 365 : null
)

const facts = ref(pickFacts(3))
function shuffle() {
  facts.value = pickFacts(3, (Math.random() * 2 ** 31) | 0)
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Scale" :title="section.label" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <p class="text-sm text-muted">
        A "typical day" here just means an annual figure divided by 365 — not a live count.
      </p>

      <div v-if="loading" class="card flex items-center justify-center py-20 text-sm text-muted">
        Loading…
      </div>

      <div v-else-if="error" class="card border-line-strong">
        <p class="text-sm font-semibold text-ink">Couldn't load the birth &amp; death figures</p>
        <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
          <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
          <p class="mt-2 whitespace-pre-wrap break-words">{{ error }}</p>
        </details>
        <button type="button" class="btn-secondary mt-4" @click="load">Try again</button>
      </div>

      <template v-else-if="data">
        <!-- Core: births / deaths / net -->
        <section>
          <h2 class="mb-4 text-base font-semibold text-ink">In a typical US day</h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="card">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">Babies born</dt>
              <dd class="mt-1.5 text-3xl font-semibold tracking-tight text-ink">~{{ human(birthsPerDay) }}</dd>
            </div>
            <div class="card">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">People who die</dt>
              <dd class="mt-1.5 text-3xl font-semibold tracking-tight text-ink">~{{ human(deathsPerDay) }}</dd>
            </div>
            <div class="card">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">Net change</dt>
              <dd class="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
                {{ netPerDay >= 0 ? '+' : '−' }}{{ human(Math.abs(netPerDay)) }}
              </dd>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted">
            Based on {{ data.periodLabel }}. Source: {{ data.source }}.
          </p>
        </section>

        <!-- Rotating scale facts -->
        <section>
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 class="text-base font-semibold text-ink">Meanwhile, in the same 24 hours…</h2>
            <button type="button" class="btn-secondary px-3 py-1 text-xs" @click="shuffle">
              Show me others
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div v-for="f in facts" :key="f.label" class="card">
              <dd class="text-3xl font-semibold tracking-tight text-ink">~{{ human(perDay(f)) }}</dd>
              <dt class="mt-1.5 text-sm text-ink">{{ f.label }}</dt>
              <p class="mt-2 text-xs text-muted">
                <span class="badge mr-1.5">{{ f.scope }}</span>{{ f.source }}
              </p>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted">
            These are rough public estimates (annual ÷ 365), included for scale — not precise, and
            not health data.
          </p>
        </section>
      </template>
    </div>
  </div>
</template>
