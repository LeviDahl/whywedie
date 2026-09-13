<script setup>
import { computed, ref, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { datasetJsonLd } from '@/seo.js'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchInternationalComparison } from '@/api/international.js'
import { sections } from '@/nav.js'
import { trackEvent } from '@/lib/analytics.js'

const section = sections.find((s) => s.name === 'international')

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(
        datasetJsonLd({
          name: 'US vs. UK, France, and Japan: death rate, life expectancy, fertility',
          description:
            'The US crude death rate, life expectancy at birth, and fertility rate compared ' +
            'with the UK, France, and Japan, 1968–2023. From the World Bank.',
          path: '/international',
          temporal: '1968/2023',
          keywords: [
            'US life expectancy vs other countries',
            'international death rate comparison',
            'US fertility rate vs other countries',
            'why is US life expectancy lower',
            'World Bank health data'
          ]
        })
      )
    }
  ]
})

const intl = useAsyncData(fetchInternationalComparison)
onMounted(() => intl.load())

const METRICS = {
  lifeExpectancy: { label: 'Life expectancy', fmt: (v) => (v == null ? '—' : v.toFixed(1)) },
  deathRate: { label: 'Death rate', fmt: (v) => (v == null ? '—' : v.toFixed(1)) },
  fertilityRate: { label: 'Fertility rate', fmt: (v) => (v == null ? '—' : v.toFixed(2)) }
}
const metric = ref('lifeExpectancy')
function setMetric(key) {
  metric.value = key
  trackEvent('chart_toggle', { page: 'international', control: 'metric', value: key })
}
const fmt = computed(() => METRICS[metric.value].fmt)

const current = computed(() => intl.data.value?.byIndicator?.[metric.value] ?? null)

const chartSeries = computed(() => {
  const d = intl.data.value
  const c = current.value
  if (!d || !c) return null
  return {
    labels: c.years,
    series: d.countries.map((country) => ({
      label: country.name,
      values: c.byCountry[country.code]
    }))
  }
})

const table = computed(() => {
  const d = intl.data.value
  const c = current.value
  if (!d || !c) return null
  return {
    columns: ['Year', ...d.countries.map((co) => co.name)],
    rows: c.years.map((y, i) => [y, ...d.countries.map((co) => c.byCountry[co.code][i])])
  }
})

// Latest year every country has a value for the current metric.
const latestYear = computed(() => {
  const c = current.value
  if (!c) return null
  for (let i = c.years.length - 1; i >= 0; i--) {
    if (Object.values(c.byCountry).every((vals) => vals[i] != null)) return { year: c.years[i], i }
  }
  return null
})

const summary = computed(() => {
  const d = intl.data.value
  const c = current.value
  const ly = latestYear.value
  if (!d || !c || !ly) return ''
  const rows = d.countries
    .map((co) => ({ name: co.name, v: c.byCountry[co.code][ly.i] }))
    .sort((a, b) => b.v - a.v)
  const label = METRICS[metric.value].label.toLowerCase()
  const parts = rows.map((r) => `${r.name} ${fmt.value(r.v)}`)
  return `In ${ly.year}, ${label} ranked: ${parts.join(', ')}.`
})
</script>

<template>
  <div>
    <PageHeader eyebrow="International" title="US vs. Peer Countries" :description="section.description" />

    <div class="mx-auto max-w-4xl space-y-8 px-6 py-10 sm:px-10">
      <div v-if="intl.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
        Loading…
      </div>
      <div v-else-if="intl.error.value" class="card border-line-strong">
        <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
        <button type="button" class="btn-secondary mt-4" @click="intl.load">Try again</button>
      </div>
      <template v-else-if="intl.data.value">
        <p v-if="summary" class="max-w-2xl text-base leading-relaxed text-ink-soft">{{ summary }}</p>

        <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
          <button
            v-for="(m, key) in METRICS"
            :key="key"
            type="button"
            class="px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
            :class="metric === key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
            @click="setMetric(key)"
          >
            {{ m.label }}
          </button>
        </div>

        <div v-if="chartSeries" class="card">
          <TimeSeriesChart
            :labels="chartSeries.labels"
            :series="chartSeries.series"
            :value-formatter="fmt"
            :aria-label="`Line chart: ${METRICS[metric].label} for the US, UK, France, and Japan, ${chartSeries.labels[0]} to ${chartSeries.labels.at(-1)}.`"
            png-name="whywedie-international-comparison"
            png-source="World Bank"
          />
          <ChartToolbar
            v-if="table"
            :columns="table.columns"
            :rows="table.rows"
            filename="whywedie-international-comparison"
          />
        </div>
      </template>

      <p class="border-t border-line pt-6 text-xs text-muted">
        From the <a href="https://data.worldbank.org/" target="_blank" rel="noopener noreferrer" class="link-underline" data-umami-event="outbound_click" data-umami-event-host="worldbank.org">World Bank</a>,
        not CDC — the only section of this site that isn't. Four countries, not a full
        world ranking: picked for contrast rather than completeness. Japan's much older
        population gives it a higher crude death rate than the US despite longer life
        expectancy, a reminder that a crude rate mixes in a country's age structure (see the
        age-adjusted rate on <RouterLink to="/death-statistics" class="link-underline">Death Statistics</RouterLink>
        for why that matters).
      </p>
    </div>
  </div>
</template>
