<script setup>
import { computed, ref, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { datasetJsonLd } from '@/seo.js'
import PageHeader from '@/components/PageHeader.vue'
import RankedBarChart from '@/components/RankedBarChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchStateComparison } from '@/api/stateComparison.js'
import { sections } from '@/nav.js'
import { trackEvent } from '@/lib/analytics.js'

const section = sections.find((s) => s.name === 'state-comparison')

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(
        datasetJsonLd({
          name: 'US death rates by state',
          description:
            'Age-adjusted death rates by US state for leading causes of death, quarterly. ' +
            'National, from CDC NCHS.',
          path: '/state-comparison',
          temporal: '2023/..',
          keywords: [
            'death rate by state',
            'which state has the highest death rate',
            'state mortality comparison',
            'drug overdose rate by state',
            'suicide rate by state'
          ]
        })
      )
    }
  ]
})

const sc = useAsyncData(fetchStateComparison)
onMounted(() => sc.load())

const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))

const cause = ref('All causes')
function setCause(c) {
  cause.value = c
  trackEvent('chart_toggle', { page: 'state-comparison', control: 'cause', value: c })
}

const current = computed(() => sc.data.value?.byCause?.[cause.value] ?? null)

const ranked = computed(() => {
  const c = current.value
  if (!c?.latest) return null
  return [...c.latest.states].sort((a, b) => b.rate - a.rate)
})

const chartProps = computed(() => {
  if (!ranked.value) return null
  return {
    labels: ranked.value.map((s) => s.state),
    series: [{ label: current.value.latestQuarter, values: ranked.value.map((s) => s.rate) }]
  }
})

const table = computed(() => {
  if (!ranked.value) return null
  return {
    columns: ['State', 'Age-adjusted rate (per 100,000)'],
    rows: ranked.value.map((s) => [s.state, s.rate])
  }
})

const summary = computed(() => {
  const r = ranked.value
  const c = current.value
  if (!r?.length || !c) return ''
  const highest = r[0]
  const lowest = r.at(-1)
  const nationalTxt = c.latest.national != null ? `; the national rate is ${c.latest.national.toFixed(1)}` : ''
  return (
    `For ${cause.value.toLowerCase()}, ${highest.state} had the highest age-adjusted rate in the ` +
    `US as of ${c.latestQuarter} (${highest.rate.toFixed(1)} per 100,000) and ${lowest.state} the ` +
    `lowest (${lowest.rate.toFixed(1)})${nationalTxt}.`
  )
})
</script>

<template>
  <div>
    <PageHeader eyebrow="Mortality" title="US Death Rates by State" :description="section.description" />

    <div class="mx-auto max-w-4xl space-y-8 px-6 py-10 sm:px-10">
      <div v-if="sc.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
        Loading…
      </div>
      <div v-else-if="sc.error.value" class="card border-line-strong">
        <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
        <button type="button" class="btn-secondary mt-4" @click="sc.load">Try again</button>
      </div>
      <template v-else-if="sc.data.value">
        <p v-if="summary" class="max-w-2xl text-base leading-relaxed text-ink-soft">{{ summary }}</p>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium uppercase tracking-wide text-muted">Cause</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="c in sc.data.value.causes"
              :key="c"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150"
              :class="
                cause === c
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-transparent text-ink hover:bg-paper-soft'
              "
              @click="setCause(c)"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <div v-if="chartProps" class="card">
          <RankedBarChart
            :labels="chartProps.labels"
            :series="chartProps.series"
            :value-formatter="rateFormatter"
            :legend="false"
            :aria-label="`Horizontal bar chart: age-adjusted ${cause} death rate by US state, ${current.latestQuarter}.`"
            png-name="whywedie-state-death-rates"
            png-source="NCHS/CDC"
          />
          <ChartToolbar
            v-if="table"
            :columns="table.columns"
            :rows="table.rows"
            filename="whywedie-state-death-rates"
            :note="`${current.latestQuarter} · 12 months ending with quarter`"
          />
        </div>
        <p v-else class="text-sm text-muted">No state data for this cause yet.</p>
      </template>

      <p class="border-t border-line pt-6 text-xs text-muted">
        Age-adjusted rates, 12 months ending with the listed quarter, from NCHS's quarterly
        provisional release — not the finalized annual WONDER figures used elsewhere on this
        site, and only available back to 2023. A state's rate can be suppressed or missing for a
        quarter with too few deaths to report reliably. Nothing here is individual-level.
      </p>
    </div>
  </div>
</template>
