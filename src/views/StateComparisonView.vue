<script setup>
import { computed, ref, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { datasetJsonLd } from '@/seo.js'
import PageHeader from '@/components/PageHeader.vue'
import TileGridMap from '@/components/TileGridMap.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchStateComparison } from '@/api/stateComparison.js'
import { fetchRegionPopulation } from '@/api/populationByRegion.js'
import { STATE_GRID, GRID_COLS, GRID_ROWS, REGION_GRID, REGION_GRID_COLS, REGION_GRID_ROWS } from '@/data/usStateGrid.js'
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
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(
        datasetJsonLd({
          name: 'US population by Census region',
          description:
            'Total US population by Census region (Northeast, Midwest, South, West), annually ' +
            'since 2010. From the US Census Bureau.',
          path: '/state-comparison',
          temporal: '2010/..',
          citation: 'US Census Bureau — Population Estimates Program (PEP)',
          keywords: [
            'US population by region',
            'is the Midwest losing population',
            'South population growth',
            'US regional population trends',
            'Census Bureau region population'
          ]
        })
      )
    }
  ]
})

const sc = useAsyncData(fetchStateComparison)
const pop = useAsyncData(fetchRegionPopulation)
onMounted(() => {
  sc.load()
  pop.load()
})

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

const activeGrid = computed(() => (view.value === 'regions' ? REGION_GRID : STATE_GRID))
const activeGridCols = computed(() => (view.value === 'regions' ? REGION_GRID_COLS : GRID_COLS))
const activeGridRows = computed(() => (view.value === 'regions' ? REGION_GRID_ROWS : GRID_ROWS))

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

// Population by region — a real Census-published total, unlike the
// death-rate rollup above, so no averaging caveat here.
const popFormatter = (v) => (v == null ? '—' : `${(v / 1e6).toFixed(1)}M`)

const popChart = computed(() => {
  const d = pop.data.value
  if (!d) return null
  return {
    labels: d.years,
    series: d.regions.map((r) => ({ label: r, values: d.byRegion[r] }))
  }
})

const popTable = computed(() => {
  const d = pop.data.value
  if (!d) return null
  return {
    columns: ['Year', ...d.regions],
    rows: d.years.map((y, i) => [y, ...d.regions.map((r) => d.byRegion[r][i])])
  }
})

// Finds the fastest- and slowest-growing region over the full span, from
// the real numbers — never assume which one that is, since it can shift
// as new years get added.
const popSummary = computed(() => {
  const d = pop.data.value
  if (!d?.years?.length) return ''
  const firstYear = d.years[0]
  const lastYear = d.years.at(-1)
  const changes = d.regions
    .map((r) => {
      const series = d.byRegion[r]
      const first = series[0]
      const last = series.at(-1)
      return first ? { region: r, pct: ((last - first) / first) * 100 } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct)
  if (changes.length < 2) return ''
  const fastest = changes[0]
  const slowest = changes.at(-1)
  const pctTxt = (p) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`
  const verb = (p) => (p >= 0 ? 'grew' : 'shrank')
  return (
    `From ${firstYear} to ${lastYear}, the ${fastest.region} ${verb(fastest.pct)} the most ` +
    `(${pctTxt(fastest.pct)}), while the ${slowest.region} ${verb(slowest.pct)} the ` +
    `${slowest.pct >= 0 ? 'least' : 'most'} (${pctTxt(slowest.pct)}).`
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
          <TileGridMap
            :grid="activeGrid"
            :grid-cols="activeGridCols"
            :grid-rows="activeGridRows"
            :items="ranked"
            :value-formatter="rateFormatter"
            :aria-label="`US map, one tile per ${view === 'regions' ? 'Census region' : 'state'}, coloured by age-adjusted ${cause} death rate, ${current.latestQuarter}.`"
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
          <p v-if="view === 'states'" class="mt-4 text-xs text-muted">
            Each tile is a state (plus DC) in its rough real position, coloured by its rate —
            darker means higher for whichever cause is selected. Every state keeps its spot even
            with no data this quarter (a small grey tile) so the map stays complete.
          </p>
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

      <section class="border-t border-line pt-8">
        <h2 class="mb-4 text-base font-semibold text-ink">Population by Region</h2>

        <div v-if="pop.loading.value" class="card flex items-center justify-center py-16 text-sm text-muted">
          Loading…
        </div>
        <template v-else-if="popChart">
          <p v-if="popSummary" class="mb-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {{ popSummary }}
          </p>
          <div class="card">
            <TimeSeriesChart
              :labels="popChart.labels"
              :series="popChart.series"
              :value-formatter="popFormatter"
              :aria-label="`Line chart: total US population by Census region, ${popChart.labels[0]} to ${popChart.labels.at(-1)}.`"
              png-name="whywedie-population-by-region"
              png-source="US Census Bureau"
            />
            <ChartToolbar
              v-if="popTable"
              :columns="popTable.columns"
              :rows="popTable.rows"
              filename="whywedie-population-by-region"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            US Census Bureau region totals (Northeast, Midwest, South, West), July 1 resident
            population estimates — a real published sum, not derived from the state death rates
            above. The 2019-to-2020 step partly reflects the decennial Census resetting each
            region's count, not a sudden one-year change.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>
