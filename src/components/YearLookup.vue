<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { useNamePreference } from '@/composables/useNamePreference.js'
import { fetchYearFacts } from '@/api/yearFacts.js'
import { displayName } from '@/data/causeNames.js'
import { generationForYear } from '@/data/generations.js'
import ChartToolbar from '@/components/ChartToolbar.vue'

const route = useRoute()
const router = useRouter()

const { data, error, loading, load } = useAsyncData(fetchYearFacts)
onMounted(load)

const { nameStyle } = useNamePreference()

const initialYear = Number(route.query.year)
const year = ref(Number.isInteger(initialYear) ? initialYear : 2000)
watch(data, (d) => {
  if (d && !d.byYear.has(year.value)) year.value = d.maxYear
})
watch(year, (y) => {
  router.replace({ query: { ...route.query, year: y === 2000 ? undefined : String(y) } })
})

const yearTable = computed(() => {
  if (!data.value) return null
  return {
    columns: ['Year', 'Births', 'Birth rate', 'Deaths', 'Natural increase', 'Leading cause'],
    rows: data.value.years.map((y) => {
      const f = data.value.byYear.get(y)
      return [
        y,
        f.births ?? '',
        f.birthRate ?? '',
        f.deaths ?? '',
        f.naturalIncrease ?? '',
        f.leadingCause ? displayName(f.leadingCause, nameStyle.value) : ''
      ]
    })
  }
})

const facts = computed(() => data.value?.byYear.get(year.value) ?? null)
const generation = computed(() => generationForYear(year.value))
const int = (v) => (v == null ? null : v.toLocaleString())
const signed = (v) => (v == null ? null : (v >= 0 ? '+' : '−') + Math.abs(v).toLocaleString())
</script>

<template>
  <div class="card">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">In the year</h2>
      <label class="sr-only" for="year-lookup">Year</label>
      <input
        id="year-lookup"
        v-model.number="year"
        type="number"
        :min="data?.minYear ?? 1909"
        :max="data?.maxYear ?? 2025"
        step="1"
        class="w-24 rounded-lg border border-line-strong bg-paper px-2.5 py-1 text-lg font-semibold text-ink"
      />
    </div>

    <p v-if="loading" class="mt-4 text-sm text-muted">Loading…</p>
    <div v-else-if="error" class="mt-4">
      <p class="text-sm text-muted">Couldn't load the year data.</p>
      <button type="button" class="btn-secondary mt-3" @click="load">Try again</button>
    </div>

    <template v-else-if="data">
      <dl v-if="facts" class="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div v-if="facts.births != null">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Americans born</dt>
          <dd class="mt-1 text-2xl font-semibold tracking-tight text-ink">{{ int(facts.births) }}</dd>
          <dd v-if="facts.birthRate != null" class="mt-0.5 text-xs text-muted">
            {{ facts.birthRate }} per 1,000 people
          </dd>
          <dd v-if="generation" class="mt-0.5 text-xs text-muted">
            {{ generation }} generation (Pew)
          </dd>
        </div>

        <div v-if="facts.deaths != null">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Americans who died</dt>
          <dd class="mt-1 text-2xl font-semibold tracking-tight text-ink">{{ int(facts.deaths) }}</dd>
        </div>

        <div v-if="facts.naturalIncrease != null">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Population change (births − deaths)
          </dt>
          <dd class="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {{ signed(facts.naturalIncrease) }}
          </dd>
        </div>

        <div v-if="facts.leadingCause">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">Leading cause of death</dt>
          <dd class="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {{ displayName(facts.leadingCause, nameStyle) }}
          </dd>
          <dd class="mt-0.5 text-xs text-muted">{{ int(facts.leadingCauseDeaths) }} deaths</dd>
        </div>
      </dl>

      <p v-else class="mt-4 text-sm text-muted">No data for {{ year }} in these sources.</p>

      <p class="mt-5 text-xs text-muted">
        Births {{ data.minYear }}–{{ data.maxYear }} · deaths &amp; population change 1968–{{
          data.maxYear
        }}
        · leading cause 1999 on (the NCHS 113-cause era) · generation labels from Pew's cutoffs
        (Silent onward). Source: {{ data.source }}.
      </p>

      <ChartToolbar
        v-if="yearTable"
        :columns="yearTable.columns"
        :rows="yearTable.rows"
        note="Every year, all sources"
        filename="whywedie-by-year"
      />
    </template>
  </div>
</template>
