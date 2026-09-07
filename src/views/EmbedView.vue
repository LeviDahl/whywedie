<script setup>
// /embed/:slug — one chart, no site chrome, for <iframe> embeds on other
// sites (App.vue renders this route "bare"). Config per slug below; a few
// key params (metric, range) are read from the query so an embedder can
// pick a view. Attribution bar links back to the real page.
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import RankedBarChart from '@/components/RankedBarChart.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchHistoricalAnnualDeaths } from '@/api/historicalDeaths.js'
import { fetchAnnualNatality } from '@/api/natality.js'
import { fetchBirthsVsDeaths } from '@/api/populationChange.js'
import { fetchCausesOfDeath } from '@/api/causesOfDeath.js'
import { displayName } from '@/data/causeNames.js'
import { SITE_URL, SITE_NAME } from '@/seo.js'

const route = useRoute()
const slug = String(route.params.slug || '')
const q = route.query

const int = (v) => (v == null ? '—' : v.toLocaleString())
const rate = (v) => (v == null ? '—' : v.toFixed(1))
const compact = (v) => {
  if (v == null) return '—'
  const a = Math.abs(v)
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return Math.round(v / 1e3) + 'K'
  return String(Math.round(v))
}
const tail = (arr, n) => (!n || n === Infinity ? arr.slice() : arr.slice(Math.max(0, arr.length - n)))
const rangeN = () => {
  const n = Number(q.range)
  return Number.isFinite(n) && n > 0 ? n : Infinity
}

const CONFIGS = {
  'us-deaths': {
    title: 'US deaths per year',
    path: '/death-statistics',
    source: 'CDC WONDER',
    fetch: fetchHistoricalAnnualDeaths,
    build(d) {
      const rateMode = q.metric === 'rate'
      const field = rateMode ? d.ageAdjustedRate : d.totalDeaths
      let from = field.findIndex((v) => v != null)
      if (from < 0) from = 0
      let to = field.length
      while (to > from && field[to - 1] == null) to--
      const years = d.years.slice(from, to)
      const values = field.slice(from, to)
      const muted = d.isProvisional.slice(from, to)
      const n = rangeN()
      return {
        component: TimeSeriesChart,
        props: {
          labels: tail(years, n),
          values: tail(values, n),
          mutedPoints: tail(muted, n),
          seriesLabel: rateMode ? 'Age-adjusted rate per 100,000' : 'Deaths',
          valueFormatter: rateMode ? rate : int
        }
      }
    }
  },
  'us-births': {
    title: 'US births per year',
    path: '/birth-statistics',
    source: 'CDC WONDER + Census',
    fetch: fetchAnnualNatality,
    build(d) {
      const metric = ['fertilityRate', 'birthRate'].includes(q.metric) ? q.metric : 'births'
      const years = d.years.filter((y, i) => !d.partial[i])
      let vals = years.map((y) => d.byYear[y]?.[metric] ?? null)
      let end = vals.length
      while (end > 0 && vals[end - 1] == null) end--
      const n = rangeN()
      const isRate = metric !== 'births'
      return {
        component: TimeSeriesChart,
        props: {
          labels: tail(years.slice(0, end), n),
          values: tail(vals.slice(0, end), n),
          seriesLabel:
            metric === 'fertilityRate'
              ? 'Births per 1,000 women 15–44'
              : metric === 'birthRate'
                ? 'Births per 1,000 people'
                : 'Births',
          valueFormatter: isRate ? rate : int
        }
      }
    }
  },
  'births-vs-deaths': {
    title: 'US births vs. deaths',
    path: '/population-change',
    source: 'CDC WONDER',
    fetch: fetchBirthsVsDeaths,
    build(d) {
      const n = rangeN()
      return {
        component: TimeSeriesChart,
        props: {
          labels: tail(d.years, n),
          series: [
            { label: 'Births', values: tail(d.births, n) },
            { label: 'Deaths', values: tail(d.deaths, n), muted: tail(d.provisional, n) }
          ],
          valueFormatter: compact
        }
      }
    }
  },
  'leading-causes-of-death': {
    title: 'Leading causes of death in the US',
    path: '/causes-of-death',
    source: 'CDC WONDER',
    fetch: fetchCausesOfDeath,
    build(d) {
      const metric = ['ageAdjustedRate', 'crudeRate'].includes(q.metric) ? q.metric : 'deaths'
      const yr = d.years.at(-1)
      const rows = (d.byYear[yr] ?? [])
        .filter((r) => r[metric] != null)
        .slice()
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, 12)
      return {
        component: RankedBarChart,
        props: {
          labels: rows.map((r) => displayName(r.cause, 'friendly')),
          series: [{ label: `${yr}`, values: rows.map((r) => r[metric]) }],
          valueFormatter: metric === 'deaths' ? int : rate,
          legend: false
        },
        subtitle: `${yr}`
      }
    }
  }
}

const cfg = CONFIGS[slug]
const { data, loading, error, load } = useAsyncData(cfg ? cfg.fetch : async () => null)
onMounted(() => { if (cfg) load() })

const chart = computed(() => (cfg && data.value ? cfg.build(data.value) : null))

useHead({
  title: cfg ? `${cfg.title} — ${SITE_NAME}` : `Embed — ${SITE_NAME}`,
  meta: [{ name: 'robots', content: 'noindex,follow' }]
})
</script>

<template>
  <!-- Plain block flow (no flexbox): the chart's wrapper must have a
       definite width the instant Chart.js measures it, or it renders at
       width 0 and never self-corrects inside an iframe. -->
  <div class="min-h-screen bg-paper p-3">
    <div v-if="!cfg" class="pt-8 text-center text-sm text-muted">Unknown chart.</div>

    <template v-else>
      <h1 class="mb-1 text-sm font-semibold text-ink">
        {{ cfg.title }}<span v-if="chart?.subtitle" class="text-muted"> · {{ chart.subtitle }}</span>
      </h1>

      <div v-if="loading" class="py-16 text-center text-xs text-muted">Loading…</div>
      <div v-else-if="error" class="py-16 text-center text-xs text-muted">
        Couldn't load this chart.
      </div>
      <div v-else-if="chart" class="overflow-y-auto">
        <component :is="chart.component" v-bind="chart.props" />
      </div>

      <div class="mt-2 flex items-center justify-between gap-3 border-t border-line pt-1.5 text-[11px] text-muted">
        <a
          :href="`${SITE_URL}${cfg.path}`"
          target="_blank"
          rel="noopener"
          class="font-medium text-ink hover:underline"
        >
          whywedie.org
        </a>
        <span>Source: {{ cfg.source }}</span>
      </div>
    </template>
  </div>
</template>
