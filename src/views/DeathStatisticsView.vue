<script setup>
import { computed, ref, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { datasetJsonLd } from '@/seo.js'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import RankedBarChart from '@/components/RankedBarChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import RangeTabs from '@/components/RangeTabs.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchHistoricalAnnualDeaths } from '@/api/historicalDeaths.js'
import { fetchMonthlyDeaths } from '@/api/monthlyDeaths.js'
import { fetchLifeExpectancy } from '@/api/lifeExpectancy.js'
import { fetchDeathsByAge } from '@/api/deathsByAge.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'death-statistics')

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(
        datasetJsonLd({
          name: 'US death statistics over time',
          description:
            'Annual United States deaths since 1968, the age-adjusted death rate and life ' +
            'expectancy at birth back to 1900, seasonal (by-month) mortality, and the most ' +
            'recent monthly provisional counts. National, from CDC / NCHS.',
          path: '/death-statistics',
          temporal: '1900/..',
          keywords: [
            'US death rate',
            'deaths per year United States',
            'age-adjusted death rate',
            'US life expectancy',
            'life expectancy at birth',
            'winter mortality seasonality',
            'CDC deaths by year'
          ]
        })
      )
    }
  ]
})

const historical = useAsyncData(fetchHistoricalAnnualDeaths)
const monthly = useAsyncData(fetchMonthlyDeaths)
const lifeExp = useAsyncData(fetchLifeExpectancy)
const byAge = useAsyncData(fetchDeathsByAge)

onMounted(() => {
  historical.load()
  monthly.load()
  lifeExp.load()
  byAge.load()
})

const integerFormatter = (v) => (v == null ? '—' : v.toLocaleString())
const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))

// The annual chart plots either the raw count (WONDER, 1968+) or the
// age-adjusted rate, which extends back to 1900 from CDC's historical
// series. Crude rate has no pre-1968 source so it isn't offered here.
const ANNUAL_METRICS = {
  deaths: { key: 'totalDeaths', label: 'Total deaths', fmt: integerFormatter },
  ageAdjustedRate: {
    key: 'ageAdjustedRate',
    label: 'Age-adjusted rate',
    fmt: rateFormatter
  }
}
const metric = ref('deaths')
const metricFmt = computed(() => ANNUAL_METRICS[metric.value].fmt)

// --- Historical annual (1900–present for the rate, 1968+ for counts) ---
const annualYears = computed(() => historical.data.value?.years ?? [])
const latestYear = computed(() => annualYears.value.at(-1) ?? null)
const latestYearDeaths = computed(() => historical.data.value?.totalDeaths?.at(-1) ?? null)
const latestYearProvisional = computed(
  () => Boolean(historical.data.value?.isProvisional?.at(-1))
)
const hasProvisional = computed(() => historical.data.value?.isProvisional?.some(Boolean))
const firstProvisionalYear = computed(() => {
  const d = historical.data.value
  if (!d) return null
  const i = d.isProvisional.findIndex(Boolean)
  return i === -1 ? null : d.years[i]
})

// --- Current monthly --- (headline the latest COMPLETE month) ---
const latestCompleteMonthIdx = computed(() => {
  const d = monthly.data.value
  if (!d?.labels?.length) return -1
  for (let i = d.labels.length - 1; i >= 0; i--) {
    if (!d.partial?.[i]) return i
  }
  return d.labels.length - 1
})
const latestMonthLabel = computed(() =>
  latestCompleteMonthIdx.value >= 0
    ? monthly.data.value.labels[latestCompleteMonthIdx.value]
    : null
)
const latestMonthDeaths = computed(() =>
  latestCompleteMonthIdx.value >= 0
    ? monthly.data.value.values[latestCompleteMonthIdx.value]
    : null
)
const monthlyHasPartial = computed(() => monthly.data.value?.partial?.some(Boolean))

// --- time-range windows -------------------------------------------------
const ANNUAL_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '25y', label: '25 yr', n: 25 },
  { key: '50y', label: '50 yr', n: 50 },
  { key: 'max', label: 'Max', n: Infinity }
]
const MONTHLY_RANGES = [
  { key: 'ytd', label: 'YTD' },
  { key: '1y', label: '1 yr', n: 12 },
  { key: '5y', label: '5 yr', n: 60 },
  { key: 'max', label: 'Max', n: Infinity }
]
const annualRange = ref('max')
const monthlyRange = ref('5y')

const tail = (arr, n) => (n === Infinity ? arr.slice() : arr.slice(Math.max(0, arr.length - n)))

const annualView = computed(() => {
  const d = historical.data.value
  if (!d?.years?.length) return null
  const field = ANNUAL_METRICS[metric.value].key
  const series = d[field] ?? []
  // Trim the leading and trailing runs of nulls: the count series is empty
  // before 1968, and the age-adjusted rate has no value for the newest
  // provisional years until a pipeline run fills them — without this the
  // x-axis (and the "1900–YYYY" caption) would stretch past the last point.
  const start = series.findIndex((v) => v != null)
  const from = start < 0 ? 0 : start
  let to = series.length
  while (to > from && series[to - 1] == null) to--
  const years = d.years.slice(from, to)
  const values = series.slice(from, to)
  const muted = d.isProvisional.slice(from, to)
  const n = ANNUAL_RANGES.find((r) => r.key === annualRange.value)?.n ?? Infinity
  return { labels: tail(years, n), values: tail(values, n), muted: tail(muted, n) }
})

const monthlyView = computed(() => {
  const d = monthly.data.value
  if (!d?.labels?.length) return null
  const partial = d.partial ?? d.labels.map(() => false)
  if (monthlyRange.value === 'ytd') {
    const lastYear = d.months?.at(-1)?.year
    const keep = (d.months ?? [])
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.year === lastYear)
    return {
      labels: keep.map(({ m }) => m.label),
      values: keep.map(({ m }) => m.deaths),
      muted: keep.map(({ i }) => partial[i])
    }
  }
  const n = MONTHLY_RANGES.find((r) => r.key === monthlyRange.value)?.n ?? Infinity
  return { labels: tail(d.labels, n), values: tail(d.values, n), muted: tail(partial, n) }
})

// --- tables (always the full series) ---
// Plain-text lead paragraph — real figures in prose, so the page has
// substantive indexable content even though the charts are <canvas>.
const summary = computed(() => {
  const d = historical.data.value
  if (!d?.years?.length) return ''
  const parts = []
  const ci = d.totalDeaths.findIndex((v) => v != null)
  const ly = d.years.at(-1)
  const ld = d.totalDeaths.at(-1)
  if (ci >= 0 && ld != null) {
    const prov = d.isProvisional?.at(-1) ? ' (provisional)' : ''
    parts.push(
      `About ${ld.toLocaleString()} people died in the United States in ${ly}${prov}, ` +
        `up from ${d.totalDeaths[ci].toLocaleString()} in ${d.years[ci]} as the population grew and aged.`
    )
  }
  const ar = d.ageAdjustedRate ?? []
  const af = ar.findIndex((v) => v != null)
  let al = -1
  for (let i = ar.length - 1; i >= 0; i--) if (ar[i] != null) { al = i; break }
  if (af >= 0 && al >= 0 && af !== al) {
    parts.push(
      `Adjusted for that ageing, the death rate has fallen sharply — from about ` +
        `${Math.round(ar[af]).toLocaleString()} per 100,000 in ${d.years[af]} to ` +
        `${Math.round(ar[al]).toLocaleString()} in ${d.years[al]}.`
    )
  }
  parts.push(
    'The charts below cover annual deaths and the latest monthly provisional counts; ' +
      'every chart has a data table and a CSV download.'
  )
  return parts.join(' ')
})

const annualTable = computed(() => {
  const d = historical.data.value
  if (!d) return null
  return {
    columns: ['Year', 'Deaths', 'Crude rate', 'Age-adjusted rate', 'Provisional'],
    rows: d.years.map((y, i) => [
      y,
      d.totalDeaths[i],
      d.crudeRate?.[i] ?? '',
      d.ageAdjustedRate?.[i] ?? '',
      d.isProvisional[i] ? 'yes' : ''
    ]),
    note: `${d.years[0]}–${d.years.at(-1)} · rates per 100,000`
  }
})
const monthlyTable = computed(() => {
  const d = monthly.data.value
  if (!d?.months?.length) return null
  return {
    columns: ['Month', 'Deaths', 'Crude rate'],
    rows: d.months.map((m) => [m.label, m.deaths, m.crudeRate ?? '']),
    note: `${d.months[0].label}–${d.months.at(-1).label}`
  }
})

// --- Life expectancy at birth (1900–present) ---
const LE_RANGES = [
  { key: '25y', label: '25 yr', n: 25 },
  { key: '50y', label: '50 yr', n: 50 },
  { key: 'max', label: 'Max', n: Infinity }
]
const leRange = ref('max')
const lifeExpView = computed(() => {
  const d = lifeExp.data.value
  if (!d?.years?.length) return null
  const n = LE_RANGES.find((r) => r.key === leRange.value)?.n ?? Infinity
  return {
    labels: tail(d.years, n),
    values: tail(d.values, n),
    muted: tail(d.muted, n)
  }
})
const lifeExpDelta = computed(() => {
  const d = lifeExp.data.value
  if (!d?.values?.length) return null
  return { first: d.values[0], firstYear: d.years[0], last: d.values.at(-1), lastYear: d.years.at(-1) }
})
const lifeExpTable = computed(() => {
  const d = lifeExp.data.value
  if (!d) return null
  return {
    columns: ['Year', 'Life expectancy (yrs)', 'Source'],
    rows: d.years.map((y, i) => [y, d.values[i], y >= d.supplementFrom ? 'NCHS final' : 'data.cdc.gov']),
    note: `${d.years[0]}–${d.years.at(-1)} · years at birth`
  }
})

// --- Seasonality: average deaths by calendar month (recent complete years) ---
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SEASONALITY_YEARS = 6
const seasonality = computed(() => {
  const months = monthly.data.value?.months
  if (!months?.length) return null
  // full calendar years only: a year with all 12 months present
  const byYear = new Map()
  for (const m of months) {
    if (m.deaths == null) continue
    if (!byYear.has(m.year)) byYear.set(m.year, new Map())
    byYear.get(m.year).set(m.month, m.deaths)
  }
  const completeYears = [...byYear.keys()].filter((y) => byYear.get(y).size === 12).sort((a, b) => a - b)
  if (completeYears.length < 2) return null
  const use = completeYears.slice(-SEASONALITY_YEARS)
  // Normalise to a 30.44-day month so February's short length doesn't read
  // as a seasonal dip — this chart is about *rate*, not raw monthly totals.
  const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const avg = MONTH_NAMES.map((_, i) => {
    const mo = i + 1
    const vals = use.map((y) => byYear.get(y).get(mo)).filter((v) => v != null)
    if (!vals.length) return null
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    return Math.round((mean / DAYS[i]) * 30.44)
  })
  const yearMean = avg.reduce((a, b) => a + (b ?? 0), 0) / avg.filter((v) => v != null).length
  const hi = Math.max(...avg.filter((v) => v != null))
  const lo = Math.min(...avg.filter((v) => v != null))
  return {
    labels: MONTH_NAMES,
    values: avg,
    from: use[0],
    to: use.at(-1),
    swing: yearMean ? Math.round(((hi - lo) / yearMean) * 100) : null,
    hiMonth: MONTH_NAMES[avg.indexOf(hi)],
    loMonth: MONTH_NAMES[avg.indexOf(lo)]
  }
})
const seasonalityTable = computed(() => {
  const s = seasonality.value
  if (!s) return null
  return {
    columns: ['Month', 'Avg. deaths (per 30.4 days)'],
    rows: s.labels.map((m, i) => [m, s.values[i]]),
    note: `Mean of ${s.from}–${s.to}, length-adjusted`
  }
})

// --- Deaths by age group (latest complete year) ---
const byAgeChart = computed(() => {
  const d = byAge.data.value
  if (!d?.latest?.length || d.latestYear == null) return null
  return {
    labels: d.latest.map((r) => r.group),
    series: [{ label: `${d.latestYear}`, values: d.latest.map((r) => r.deaths) }]
  }
})
const byAgeShare = computed(() => {
  const d = byAge.data.value
  if (!d?.latest?.length) return null
  const total = d.latest.reduce((s, r) => s + (r.deaths ?? 0), 0)
  const old = d.latest
    .filter((r) => r.group === '75-84 years' || r.group === '85 years and older')
    .reduce((s, r) => s + (r.deaths ?? 0), 0)
  const young = d.latest.find((r) => r.group === 'Under 25 years')?.deaths ?? 0
  return {
    year: d.latestYear,
    over75Pct: total ? Math.round((old / total) * 100) : null,
    under25Pct: total ? Math.round((young / total) * 100) : null
  }
})
const byAgeTable = computed(() => {
  const d = byAge.data.value
  if (!d?.years?.length) return null
  return {
    columns: ['Age group', ...d.years.map(String)],
    rows: d.series.map((s) => [s.label, ...s.values]),
    note: `${d.years[0]}–${d.years.at(-1)} · all-cause`
  }
})
</script>

<template>
  <div>
    <PageHeader eyebrow="Mortality" title="US Death Statistics Over Time" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <p v-if="summary" class="max-w-2xl text-base leading-relaxed text-ink-soft">
        {{ summary }}
      </p>

      <!-- Stat callouts -->
      <div v-if="latestYearDeaths != null || latestMonthDeaths != null" class="grid gap-4 sm:grid-cols-2">
        <div class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Deaths in {{ latestYear }}
            ({{ latestYearProvisional ? 'provisional' : 'most recent full year' }})
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {{ integerFormatter(latestYearDeaths) }}
          </dd>
        </div>
        <div v-if="latestMonthDeaths != null" class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Deaths in {{ latestMonthLabel }} (most recent month available)
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {{ integerFormatter(latestMonthDeaths) }}
          </dd>
        </div>
      </div>

      <!-- Annual historical section -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Annual Deaths</h2>
          <div class="flex flex-wrap items-center gap-3">
            <div v-if="annualYears.length" class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="(m, key) in ANNUAL_METRICS"
                :key="key"
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="metric === key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="metric = key"
              >
                {{ m.label }}
              </button>
            </div>
            <p v-if="annualYears.length" class="text-sm text-muted">
              {{ annualView?.labels[0] }}–{{ annualView?.labels.at(-1) }}
            </p>
            <RangeTabs
              v-if="annualYears.length"
              v-model="annualRange"
              :options="ANNUAL_RANGES"
              aria-label="Annual chart range"
            />
          </div>
        </div>

        <div v-if="historical.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>

        <div v-else-if="historical.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
            <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ historical.error.value }}</p>
          </details>
          <button type="button" class="btn-secondary mt-4" @click="historical.load">Try again</button>
        </div>

        <template v-else-if="annualView">
          <div class="card">
            <TimeSeriesChart
              :labels="annualView.labels"
              :values="annualView.values"
              :muted-points="annualView.muted"
              :series-label="ANNUAL_METRICS[metric].label"
              :value-formatter="metricFmt"
              :aria-label="`Line chart: ${ANNUAL_METRICS[metric].label.toLowerCase()} in the US, ${annualView.labels[0]} to ${annualView.labels.at(-1)}. Full figures in the data table below.`"
              png-name="whywedie-annual-deaths"
              png-source="CDC WONDER"
            />
            <ChartToolbar
              v-if="annualTable"
              :columns="annualTable.columns"
              :rows="annualTable.rows"
              :note="annualTable.note"
              filename="whywedie-annual-deaths"
              embed-slug="us-deaths"
              :embed-params="{ metric: metric === 'ageAdjustedRate' ? 'rate' : undefined }"
            />
          </div>
          <p v-if="hasProvisional" class="mt-3 text-xs text-muted">
            The dashed, greyed segment ({{ firstProvisionalYear }} onward) is CDC provisional data from
            the Provisional Mortality database — close to final, but subject to small upward revision,
            and the most recent year may run a month or two short of a full year.
          </p>
          <p v-if="metric === 'ageAdjustedRate'" class="mt-1 text-xs text-muted">
            Age-adjusted to the 2000 US standard population, so years are comparable despite the
            population aging. Pre-1968 comes from CDC's historical series; before 1933 it covers the
            expanding death-registration area rather than every state. Raw death <em>counts</em> only
            go back to 1968 (no earlier source).
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ historical.data.value.source }}.</p>
        </template>
      </section>

      <!-- Current monthly section -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink">Monthly Deaths</h2>
          <div class="flex items-center gap-3">
            <p v-if="monthlyView" class="text-sm text-muted">
              {{ monthlyView.labels[0] }}–{{ monthlyView.labels.at(-1) }}
            </p>
            <RangeTabs
              v-if="monthly.data.value?.labels?.length"
              v-model="monthlyRange"
              :options="MONTHLY_RANGES"
              aria-label="Monthly chart range"
            />
          </div>
        </div>

        <div v-if="monthly.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>

        <div v-else-if="monthly.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
            <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
            <p class="mt-2 whitespace-pre-wrap break-words">{{ monthly.error.value }}</p>
          </details>
          <button type="button" class="btn-secondary mt-4" @click="monthly.load">Try again</button>
        </div>

        <div
          v-else-if="!monthly.data.value?.labels?.length"
          class="card text-sm text-muted"
        >
          Monthly figures aren't loaded yet — run the pipeline era
          <code class="text-ink">mortality --era=monthly</code>.
        </div>

        <template v-else-if="monthlyView">
          <div class="card">
            <TimeSeriesChart
              :labels="monthlyView.labels"
              :values="monthlyView.values"
              :muted-points="monthlyView.muted"
              muted-label="incomplete"
              series-label="Deaths"
              :value-formatter="integerFormatter"
              :aria-label="`Line chart: US deaths by month, ${monthlyView.labels[0]} to ${monthlyView.labels.at(-1)}. Full figures in the data table below.`"
            />
            <ChartToolbar
              v-if="monthlyTable"
              :columns="monthlyTable.columns"
              :rows="monthlyTable.rows"
              :note="monthlyTable.note"
              filename="whywedie-monthly-deaths"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            CDC provisional monthly counts (Provisional Mortality database).<template v-if="monthlyHasPartial">
              The dashed tail is the latest month or two still filling in — the count climbs as late
              records arrive.</template>
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ monthly.data.value.source }}.</p>
        </template>
      </section>

      <!-- Life expectancy at birth -->
      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="life-expectancy" class="scroll-mt-24 text-base font-semibold text-ink">
            Life Expectancy at Birth
          </h2>
          <RangeTabs
            v-if="lifeExp.data.value?.years?.length"
            v-model="leRange"
            :options="LE_RANGES"
            aria-label="Life expectancy chart range"
          />
        </div>

        <div v-if="lifeExp.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>
        <div v-else-if="lifeExp.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <button type="button" class="btn-secondary mt-4" @click="lifeExp.load">Try again</button>
        </div>
        <template v-else-if="lifeExpView">
          <p v-if="lifeExpDelta" class="mb-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            US life expectancy at birth rose from about {{ lifeExpDelta.first }} years in
            {{ lifeExpDelta.firstYear }} to {{ lifeExpDelta.last }} in {{ lifeExpDelta.lastYear }} —
            though it fell sharply in 2020–2021 during COVID-19 before recovering.
          </p>
          <div class="card">
            <TimeSeriesChart
              :labels="lifeExpView.labels"
              :values="lifeExpView.values"
              :muted-points="lifeExpView.muted"
              muted-label="NCHS final (supplement)"
              series-label="Years"
              :value-formatter="rateFormatter"
              :aria-label="`Line chart: US life expectancy at birth, ${lifeExpView.labels[0]} to ${lifeExpView.labels.at(-1)}.`"
              png-name="whywedie-life-expectancy"
              png-source="NCHS / CDC"
            />
            <ChartToolbar
              v-if="lifeExpTable"
              :columns="lifeExpTable.columns"
              :rows="lifeExpTable.rows"
              :note="lifeExpTable.note"
              filename="whywedie-life-expectancy"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            The dashed tail (2019+) comes from NCHS's final annual figures rather than the
            data.cdc.gov table, which ends at 2018.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ lifeExp.data.value.source }}.</p>
        </template>
      </section>

      <!-- Seasonality -->
      <section v-if="seasonality">
        <h2 id="seasonality" class="mb-4 scroll-mt-24 text-base font-semibold text-ink">
          When in the Year People Die
        </h2>
        <p class="mb-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Averaged over {{ seasonality.from }}–{{ seasonality.to }}, deaths peak in
          {{ seasonality.hiMonth }} and bottom out in {{ seasonality.loMonth }}
          <template v-if="seasonality.swing != null">
            — about a {{ seasonality.swing }}% swing across the year</template>,
          the familiar winter-mortality pattern.
        </p>
        <div class="card">
          <TimeSeriesChart
            :labels="seasonality.labels"
            :values="seasonality.values"
            series-label="Avg. deaths"
            :value-formatter="integerFormatter"
            aria-label="Line chart: average US deaths by calendar month, showing the winter peak."
            png-name="whywedie-deaths-seasonality"
            png-source="CDC WONDER (D176)"
          />
          <ChartToolbar
            v-if="seasonalityTable"
            :columns="seasonalityTable.columns"
            :rows="seasonalityTable.rows"
            :note="seasonalityTable.note"
            :show-link="false"
            filename="whywedie-deaths-seasonality"
          />
        </div>
        <p class="mt-3 text-xs text-muted">
          Mean all-cause deaths per month over the last
          {{ seasonality.to - seasonality.from + 1 }} complete years, adjusted to a 30.4-day
          month so February isn't understated. Includes the 2020–2021 COVID-19 waves. Source:
          {{ monthly.data.value.source }}.
        </p>
      </section>

      <!-- Deaths by age group -->
      <section v-if="byAge.loading.value || byAgeChart">
        <h2 id="deaths-by-age" class="mb-4 scroll-mt-24 text-base font-semibold text-ink">
          Deaths by Age
        </h2>

        <div v-if="byAge.loading.value" class="card flex items-center justify-center py-16 text-sm text-muted">
          Loading…
        </div>
        <template v-else-if="byAgeChart">
          <p v-if="byAgeShare" class="mb-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Death is overwhelmingly an old-age event: in {{ byAgeShare.year }}, about
            {{ byAgeShare.over75Pct }}% of US deaths were people aged 75 or older, and roughly
            {{ byAgeShare.under25Pct }}% were under 25.
          </p>
          <div class="card">
            <RankedBarChart
              :labels="byAgeChart.labels"
              :series="byAgeChart.series"
              :value-formatter="integerFormatter"
              :legend="false"
              :aria-label="`Bar chart: US deaths by age group in ${byAge.data.value.latestYear}, rising steeply with age.`"
              png-name="whywedie-deaths-by-age"
              png-source="NCHS / CDC"
            />
            <ChartToolbar
              v-if="byAgeTable"
              :columns="byAgeTable.columns"
              :rows="byAgeTable.rows"
              :note="byAgeTable.note"
              :show-link="false"
              filename="whywedie-deaths-by-age"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            All-cause deaths, {{ byAge.data.value.years[0] }}–{{ byAge.data.value.years.at(-1) }} in
            the table; the chart shows {{ byAge.data.value.latestYear }}. Source:
            {{ byAge.data.value.source }}.
          </p>
        </template>
      </section>
    </div>
  </div>
</template>
