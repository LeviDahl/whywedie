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
            'Age-adjusted death rates by US state, or rolled up by Census region, for leading ' +
            'causes of death, quarterly. National, from CDC NCHS.',
          path: '/state-comparison',
          temporal: '2023/..',
          keywords: [
            'death rate by state',
            'which state has the highest death rate',
            'state mortality comparison',
            'drug overdose rate by state',
            'suicide rate by state',
            'death rate by region'
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

// 'states' = the full 50-state + DC ranking (the signature view). 'regions'
// is a coarser, rough-chunks alternative — see usRegions.js for why it's
// an unweighted average, not a precise population-weighted rate.
const view = ref('states')
function setView(v) {
  view.value = v
  trackEvent('chart_toggle', { page: 'state-comparison', control: 'view', value: v })
}

const current = computed(() => sc.data.value?.byCause?.[cause.value] ?? null)

const ranked = computed(() => {
  const c = current.value
  if (!c?.latest) return null
  const source = view.value === 'regions' ? c.latest.regions : c.latest.states
  return [...source]
    .map((s) => ({ label: s.state ?? s.region, rate: s.rate }))
    .sort((a, b) => b.rate - a.rate)
})

const unitLabel = computed(() => (view.value === 'regions' ? 'Region' : 'State'))

const chartProps = computed(() => {
  if (!ranked.value) return null
  return {
    labels: ranked.value.map((s) => s.label),
    series: [{ label: current.value.latestQuarter, values: ranked.value.map((s) => s.rate) }]
  }
})

const table = computed(() => {
  if (!ranked.value) return null
  return {
    columns: [unitLabel.value, 'Age-adjusted rate (per 100,000)'],
    rows: ranked.value.map((s) => [s.label, s.rate])
  }
})

const summary = computed(() => {
  const r = ranked.value
  const c = current.value
  if (!r?.length || !c) return ''
  const highest = r[0]
  const lowest = r.at(-1)
  const nationalTxt = c.latest.national != null ? `; the national rate is ${c.latest.national.toFixed(1)}` : ''
  const unit = view.value === 'regions' ? 'region' : 'state'
  return (
    `For ${cause.value.toLowerCase()}, ${highest.label} had the highest age-adjusted rate ` +
    `of any ${unit} as of ${c.latestQuarter} (${highest.rate.toFixed(1)} per 100,000) and ${lowest.label} the ` +
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

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium uppercase tracking-wide text-muted">View</span>
          <div class="flex gap-1.5">
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150"
              :class="
                view === 'states'
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-transparent text-ink hover:bg-paper-soft'
              "
              @click="setView('states')"
            >
              States
            </button>
            <button
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150"
              :class="
                view === 'regions'
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-transparent text-ink hover:bg-paper-soft'
              "
              @click="setView('regions')"
            >
              Regions
            </button>
          </div>
        </div>

        <div v-if="chartProps" class="card">
          <RankedBarChart
            :labels="chartProps.labels"
            :series="chartProps.series"
            :value-formatter="rateFormatter"
            :legend="false"
            :aria-label="`Horizontal bar chart: age-adjusted ${cause} death rate by US ${view === 'regions' ? 'Census region' : 'state'}, ${current.latestQuarter}.`"
            :png-name="view === 'regions' ? 'whywedie-region-death-rates' : 'whywedie-state-death-rates'"
            png-source="NCHS/CDC"
          />
          <ChartToolbar
            v-if="table"
            :columns="table.columns"
            :rows="table.rows"
            :filename="view === 'regions' ? 'whywedie-region-death-rates' : 'whywedie-state-death-rates'"
            :note="`${current.latestQuarter} · 12 months ending with quarter`"
          />
          <p v-if="view === 'regions'" class="mt-4 text-xs text-muted">
            Regions are the US Census Bureau's four — Northeast, Midwest, South, West — and each
            rate is a plain average of that region's state rates above, not a population-weighted
            figure. Read it as a rough chunk, not a precise regional rate.
          </p>
        </div>
        <p v-else class="text-sm text-muted">No {{ view === 'regions' ? 'region' : 'state' }} data for this cause yet.</p>
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
