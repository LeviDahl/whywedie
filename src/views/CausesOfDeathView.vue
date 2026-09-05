<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import RankedBarChart from '@/components/RankedBarChart.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import RangeTabs from '@/components/RangeTabs.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { useNamePreference } from '@/composables/useNamePreference.js'
import { fetchCausesOfDeath } from '@/api/causesOfDeath.js'
import { fetchCauseBreakdown } from '@/api/causeBreakdown.js'
import { displayName } from '@/data/causeNames.js'
import { SERIES, SERIES_DASH } from '@/charts/palette.js'
import { sections } from '@/nav.js'

const route = useRoute()
const router = useRouter()
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const section = sections.find((s) => s.name === 'causes-of-death')

// Friendly vs official cause names (persisted, shared app-wide).
const { nameStyle } = useNamePreference()
const label = (officialName) => displayName(officialName, nameStyle.value)

const { data, error, loading, load } = useAsyncData(fetchCausesOfDeath)
// Optional demographic (Sex / Race) breakdown — its own snapshot file. If
// the pipeline eras haven't run it comes back { available: false } and the
// Breakdown control never renders.
const bd = useAsyncData(fetchCauseBreakdown)
onMounted(() => {
  load()
  bd.load()
})

const TOP_N = 15
const MAX_PERIODS = 4
const MAX_TREND_CAUSES = 4
const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020]

// deaths / age-adjusted rate / crude rate — keys match the row field names
// so charts can index rows with row[metric] directly.
const METRICS = {
  deaths: { label: 'Deaths', unit: 'deaths/yr' },
  ageAdjustedRate: { label: 'Age-adjusted rate', unit: 'per 100,000 (age-adjusted)' },
  crudeRate: { label: 'Crude rate', unit: 'per 100,000' }
}
const metric = ref(METRICS[route.query.metric] ? route.query.metric : 'deaths')
if (route.query.names === 'friendly' || route.query.names === 'official') {
  nameStyle.value = route.query.names
}

// --- demographic breakdown -----------------------------------------
// 'none' | 'sex' | 'race'. When not 'none' the ranked chart splits by
// subgroup for ONE period (period comparison is suspended), and the trend
// chart splits the first selected cause by subgroup.
const BREAKDOWN_LABELS = { none: 'None', sex: 'Sex', race: 'Race' }
const breakdown = ref(
  ['sex', 'race'].includes(route.query.breakdown) ? route.query.breakdown : 'none'
)
// Landing straight on a race breakdown with no explicit metric: age-adjusted
// is the honest default (crude rate mostly tracks age structure).
if (breakdown.value === 'race' && !METRICS[route.query.metric]) {
  metric.value = 'ageAdjustedRate'
}
const breakdownReady = computed(
  () => bd.data.value?.available && Boolean(bd.data.value.dimensions?.[breakdown.value])
)
const breakdownActive = computed(() => breakdown.value !== 'none' && breakdownReady.value)
// The Race breakdown spans a 2020/2021 vintage seam (bridged- vs single-race).
const raceSeam = computed(() => {
  const ys = bd.data.value?.years ?? []
  return ys.some((y) => y <= 2020) && ys.some((y) => y >= 2021)
})
const breakdownChoices = computed(() => ['none', ...(bd.data.value?.dimensionKeys ?? [])])

// Every subgroup the active dimension offers, in the snapshot's order.
const allSubgroups = computed(() =>
  breakdownActive.value ? bd.data.value.dimensions[breakdown.value].subgroups : []
)
// Subgroups the user has toggled off (per dimension). Reset on switch.
const hiddenSubgroups = ref([])
watch(breakdown, () => {
  hiddenSubgroups.value = []
})
const activeSubgroups = computed(() =>
  allSubgroups.value.filter((sg) => !hiddenSubgroups.value.includes(sg))
)
// Colour/dash follow the subgroup's fixed position in `allSubgroups`, not
// its index among the *visible* ones — hiding one must not repaint the rest.
const subgroupStyle = (sg) => {
  const i = allSubgroups.value.indexOf(sg)
  return { color: SERIES[i % SERIES.length], dash: SERIES_DASH[i % SERIES_DASH.length] }
}
function toggleSubgroup(sg) {
  const hidden = hiddenSubgroups.value
  if (hidden.includes(sg)) {
    hiddenSubgroups.value = hidden.filter((x) => x !== sg)
  } else if (activeSubgroups.value.length > 1) {
    // keep at least one visible
    hiddenSubgroups.value = [...hidden, sg]
  }
}

// Picking a breakdown collapses the comparison to a single period and, for
// Race, defaults to the age-adjusted rate (crude rate mostly tracks age
// structure). Switching back to 'none' leaves those as they are.
watch(breakdown, (b) => {
  if (b === 'none') return
  if (periods.value.length > 1) periods.value = [periods.value[0]]
  if (b === 'race' && metric.value === 'deaths') metric.value = 'ageAdjustedRate'
})

// Metric explainer popover (age-adjusted vs crude isn't common knowledge).
const showMetricHelp = ref(false)

// Ranked chart: one series per "period" (a single year or a year range).
const periods = ref([])
// Trend chart: one line per selected cause.
const trendCauses = ref([])

function parsePeriodsParam(q, years) {
  const lo = years[0]
  const hi = years.at(-1)
  const clamp = (n) => Math.min(hi, Math.max(lo, n))
  return String(q || '')
    .split(',')
    .map((s) => s.match(/^(\d{4})(?:-(\d{4}))?$/))
    .filter(Boolean)
    .map((m) => {
      const a = clamp(+m[1])
      const b = clamp(+(m[2] || m[1]))
      return { from: Math.min(a, b), to: Math.max(a, b) }
    })
    .slice(0, MAX_PERIODS)
}

watch(
  data,
  (d) => {
    if (!d) return
    if (periods.value.length === 0) {
      periods.value =
        parsePeriodsParam(route.query.periods, d.years).length
          ? parsePeriodsParam(route.query.periods, d.years)
          : [{ from: d.years.at(-1), to: d.years.at(-1) }]
    }
    if (trendCauses.value.length === 0) {
      const wanted = String(route.query.causes || '')
        .split(',')
        .filter(Boolean)
      const bySlug = new Map(d.causes.map((c) => [slug(c), c]))
      const fromUrl = wanted.map((s) => bySlug.get(s)).filter(Boolean).slice(0, MAX_TREND_CAUSES)
      trendCauses.value = fromUrl.length
        ? fromUrl
        : [d.byYear[d.years.at(-1)]?.[0]?.cause].filter(Boolean)
    }
  },
  { immediate: true }
)

// Reflect the current view in the URL so "Copy link" is shareable.
watch(
  [metric, nameStyle, periods, trendCauses, breakdown],
  ([m, n, ps, cs, bk]) => {
    router.replace({
      query: {
        ...route.query,
        metric: m === 'deaths' ? undefined : m,
        names: n === 'friendly' ? undefined : n,
        periods:
          ps.map((p) => (p.from === p.to ? `${p.from}` : `${p.from}-${p.to}`)).join(',') || undefined,
        causes: cs.map(slug).join(',') || undefined,
        breakdown: bk === 'none' ? undefined : bk
      }
    })
  },
  { deep: true }
)

const integerFormatter = (v) => (v == null ? '—' : Math.round(v).toLocaleString())
const rateFormatter = (v) => (v == null ? '—' : v.toFixed(1))
const valueFormatter = computed(() =>
  metric.value === 'deaths' ? integerFormatter : rateFormatter
)
const metricUnit = computed(() => METRICS[metric.value].unit)

// --- periods ---------------------------------------------------------
const periodLabel = (p) => (p.from === p.to ? `${p.from}` : `${p.from}–${p.to}`)

function yearsIn(p) {
  const lo = Math.min(p.from, p.to)
  const hi = Math.max(p.from, p.to)
  return (data.value?.years ?? []).filter((y) => y >= lo && y <= hi)
}

// cause name -> mean of the selected metric across the period's years
function meansForPeriod(p) {
  const acc = new Map()
  for (const y of yearsIn(p)) {
    for (const row of data.value.byYear[y] ?? []) {
      const v = row[metric.value]
      if (v == null) continue
      const a = acc.get(row.cause) ?? { sum: 0, n: 0 }
      a.sum += v
      a.n += 1
      acc.set(row.cause, a)
    }
  }
  const out = new Map()
  for (const [name, a] of acc) out.set(name, a.n ? a.sum / a.n : null)
  return out
}

const periodMeans = computed(() => (data.value ? periods.value.map(meansForPeriod) : []))

// --- breakdown means (one period, split by subgroup) ---------------
// cause display-name -> Map<subgroup, mean of the selected metric across
// the first period's years>. Rankable ('#') causes only.
function breakdownMeansMap() {
  const dim = bd.data.value.dimensions[breakdown.value]
  const p = periods.value[0]
  if (!p) return new Map()
  const lo = Math.min(p.from, p.to)
  const hi = Math.max(p.from, p.to)
  const acc = new Map()
  for (const [y, rows] of Object.entries(dim.byYear)) {
    const yr = Number(y)
    if (yr < lo || yr > hi) continue
    for (const r of rows) {
      if (!r.leading) continue
      const v = r[metric.value]
      if (v == null) continue
      const bySg = acc.get(r.causeName) ?? new Map()
      const a = bySg.get(r.subgroup) ?? { sum: 0, n: 0 }
      a.sum += v
      a.n += 1
      bySg.set(r.subgroup, a)
      acc.set(r.causeName, bySg)
    }
  }
  const out = new Map()
  for (const [name, bySg] of acc) {
    const m = new Map()
    for (const [sg, a] of bySg) m.set(sg, a.n ? a.sum / a.n : null)
    out.set(name, m)
  }
  return out
}
const breakdownMeans = computed(() => (breakdownActive.value ? breakdownMeansMap() : new Map()))

// Causes ranked by the primary (first) period — the same set is shown for
// every period so the comparison lines up row-for-row. With a breakdown
// active, rank by the total across subgroups instead.
const rankedCauseNames = computed(() => {
  if (breakdownActive.value) {
    return [...breakdownMeans.value.entries()]
      .map(([name, bySg]) => [
        name,
        [...bySg.values()].reduce((s, v) => s + (v ?? 0), 0)
      ])
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([name]) => name)
  }
  const primary = periodMeans.value[0]
  if (!primary) return []
  return [...primary.entries()]
    .sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1))
    .slice(0, TOP_N)
    .map(([name]) => name)
})

// Chart y-axis labels — display names; data below stays keyed by the
// official name.
const rankedLabels = computed(() => rankedCauseNames.value.map(label))

const rankedSeries = computed(() => {
  if (breakdownActive.value) {
    return activeSubgroups.value.map((sg) => ({
      label: sg,
      color: subgroupStyle(sg).color,
      values: rankedCauseNames.value.map((name) => breakdownMeans.value.get(name)?.get(sg) ?? null)
    }))
  }
  return periods.value.map((p, i) => ({
    label: periodLabel(p),
    values: rankedCauseNames.value.map((name) => periodMeans.value[i]?.get(name) ?? null)
  }))
})

const primaryTop = computed(() => {
  if (breakdownActive.value) return null
  const name = rankedCauseNames.value[0]
  if (!name) return null
  return { cause: name, value: periodMeans.value[0]?.get(name) ?? null }
})

const decadeButtons = computed(() => {
  const lo = data.value?.years[0] ?? Infinity
  const hi = data.value?.years.at(-1) ?? -Infinity
  return DECADES.map((d) => {
    const from = Math.max(d, lo)
    const to = Math.min(d + 9, hi)
    return { key: d, label: `${d}s`, from, to, available: from <= to }
  })
})

function addPeriodFromDecade(b) {
  if (!b.available || periods.value.length >= MAX_PERIODS) return
  if (periods.value.some((p) => p.from === b.from && p.to === b.to)) return
  periods.value.push({ from: b.from, to: b.to })
}

function addPeriod() {
  if (periods.value.length >= MAX_PERIODS) return
  const lo = data.value.years[0]
  const earliest = Math.min(...periods.value.flatMap((p) => [p.from, p.to]))
  const to = Math.max(lo, earliest - 1)
  const from = Math.max(lo, to - 9)
  periods.value.push({ from, to })
}

function removePeriod(i) {
  periods.value.splice(i, 1)
}

// --- trend ----------------------------------------------------------
const availableTrendCauses = computed(() =>
  (data.value?.causes ?? [])
    .filter((c) => !trendCauses.value.includes(c))
    .sort((a, b) => label(a).localeCompare(label(b)))
)

// The trend cause shown split by subgroup when a breakdown is active
// (one cause at a time in that mode — the first selected).
const trendBreakdownCause = computed(() =>
  breakdownActive.value ? trendCauses.value[0] ?? null : null
)

const trendSeries = computed(() => {
  if (breakdownActive.value) {
    const name = trendBreakdownCause.value
    if (!name) return []
    const dim = bd.data.value.dimensions[breakdown.value]
    const entry = Object.values(dim.byCause).find((c) => c.name === name)
    if (!entry) return []
    return activeSubgroups.value.map((sg) => ({
      label: sg,
      color: subgroupStyle(sg).color,
      dash: subgroupStyle(sg).dash,
      values: entry.subgroups[sg]?.[metric.value] ?? []
    }))
  }
  return trendCauses.value
    .filter((name) => data.value?.byCause[name])
    .map((name) => ({ label: label(name), values: data.value.byCause[name][metric.value] }))
})
const trendAllYears = computed(() =>
  (breakdownActive.value ? bd.data.value.years : data.value?.years ?? []).map(String)
)

// Time-range window for the Trend chart. The cause series are aligned to the
// full year axis, so windowing is just a tail slice of labels + every
// series' values (and the table behind it).
const TREND_RANGES = [
  { key: '10y', label: '10 yr', n: 10 },
  { key: '20y', label: '20 yr', n: 20 },
  { key: 'max', label: 'Max', n: Infinity }
]
const trendRange = ref('max')
const trendStart = computed(() => {
  const len = trendAllYears.value.length
  const n = TREND_RANGES.find((r) => r.key === trendRange.value)?.n ?? Infinity
  return n === Infinity ? 0 : Math.max(0, len - n)
})
const trendYearLabels = computed(() => trendAllYears.value.slice(trendStart.value))
const trendWindowSeries = computed(() =>
  trendSeries.value.map((s) => ({ ...s, values: (s.values ?? []).slice(trendStart.value) }))
)

// --- tables behind the two charts ---
const round2 = (v) => (v == null ? '' : Math.round(v * 100) / 100)

const rankedTable = computed(() => {
  if (!rankedCauseNames.value.length) return null
  if (breakdownActive.value) {
    return {
      columns: ['Cause', ...activeSubgroups.value],
      rows: rankedCauseNames.value.map((name) => [
        label(name),
        ...activeSubgroups.value.map((sg) => round2(breakdownMeans.value.get(name)?.get(sg)))
      ]),
      note: `${METRICS[metric.value].label} · by ${BREAKDOWN_LABELS[breakdown.value].toLowerCase()} · mean/yr, ${periods.value[0] ? periodLabel(periods.value[0]) : ''}`
    }
  }
  return {
    columns: ['Cause', ...periods.value.map(periodLabel)],
    rows: rankedCauseNames.value.map((name) => [
      label(name),
      ...periodMeans.value.map((m) => round2(m?.get(name)))
    ]),
    note: `${METRICS[metric.value].label} · mean annual value per period`
  }
})
const trendTable = computed(() => {
  if (breakdownActive.value) {
    const name = trendBreakdownCause.value
    if (!name) return null
    const dim = bd.data.value.dimensions[breakdown.value]
    const entry = Object.values(dim.byCause).find((c) => c.name === name)
    if (!entry) return null
    const years = bd.data.value.years
    return {
      columns: ['Year', ...activeSubgroups.value],
      rows: years
        .map((y, i) => [
          y,
          ...activeSubgroups.value.map((sg) => {
            const v = entry.subgroups[sg]?.[metric.value]?.[i]
            return v == null ? '' : v
          })
        ])
        .slice(trendStart.value),
      note: `${label(name)} · ${METRICS[metric.value].label} · by ${BREAKDOWN_LABELS[breakdown.value].toLowerCase()} · ${trendYearLabels.value[0]}–${trendYearLabels.value.at(-1)}`
    }
  }
  if (!data.value || !trendCauses.value.length) return null
  return {
    columns: ['Year', ...trendCauses.value.map(label)],
    rows: data.value.years
      .map((y, i) => [
        y,
        ...trendCauses.value.map((name) => {
          const v = data.value.byCause[name]?.[metric.value]?.[i]
          return v == null ? '' : v
        })
      ])
      .slice(trendStart.value),
    note: `${METRICS[metric.value].label} · ${trendYearLabels.value[0]}–${trendYearLabels.value.at(-1)}`
  }
})

function addTrendCause(name) {
  if (name && trendCauses.value.length < MAX_TREND_CAUSES && !trendCauses.value.includes(name)) {
    trendCauses.value.push(name)
  }
}
function onAddCauseSelect(event) {
  addTrendCause(event.target.value)
  event.target.selectedIndex = 0
}
function removeTrendCause(i) {
  trendCauses.value.splice(i, 1)
}

// --- broad ICD chapters (D74/D16 pre-1999 + D76/D176 1999+) --------
const MAX_CHAPTERS = 4
const chapters = computed(() => data.value?.chapters ?? null)
const chapterYearLabels = computed(() => (chapters.value?.years ?? []).map(String))
const chapterSpan = computed(() => {
  const ys = chapters.value?.years ?? []
  return ys.length ? `${ys[0]}–${ys[ys.length - 1]}` : ''
})
const chapterSeamText = computed(() => {
  const s = chapters.value?.seams ?? []
  return s.length === 1 ? `a small classification seam at ${s[0]}` : `small classification seams at ${s.join(' and ')}`
})
const activeChapters = ref([])
watch(
  chapters,
  (c) => {
    if (c && !activeChapters.value.length) {
      activeChapters.value = c.names.slice(0, MAX_CHAPTERS)
    }
  },
  { immediate: true }
)
const availableChapters = computed(() =>
  (chapters.value?.names ?? []).filter((n) => !activeChapters.value.includes(n))
)
const chapterSeries = computed(() => {
  if (!chapters.value) return []
  return activeChapters.value.map((name, i) => ({
    label: name,
    values: chapters.value.byChapter[name]?.[metric.value] ?? [],
    color: SERIES[i % SERIES.length],
    dash: SERIES_DASH[i % SERIES_DASH.length]
  }))
})
const chapterTable = computed(() => {
  if (!chapters.value) return null
  return {
    columns: ['Year', ...activeChapters.value],
    rows: chapters.value.years.map((y, i) => [
      y,
      ...activeChapters.value.map((name) => chapters.value.byChapter[name]?.[metric.value]?.[i] ?? '')
    ]),
    note: `${METRICS[metric.value].label} · ${chapters.value.years[0]}–${chapters.value.years.at(-1)}`
  }
})
function toggleChapter(name) {
  const i = activeChapters.value.indexOf(name)
  if (i >= 0) {
    if (activeChapters.value.length > 1) activeChapters.value.splice(i, 1)
  } else if (activeChapters.value.length < MAX_CHAPTERS) {
    activeChapters.value.push(name)
  }
}
function onAddChapterSelect(event) {
  toggleChapter(event.target.value)
  event.target.selectedIndex = 0
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Mortality" title="Causes of Death" :description="section.description" />

    <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10 space-y-12">
      <div v-if="loading" class="card flex items-center justify-center py-20 text-sm text-muted">
        Loading…
      </div>

      <div v-else-if="error" class="card border-line-strong">
        <p class="text-sm font-semibold text-ink">Couldn't load this data</p>
        <details class="mt-3 rounded-lg bg-paper-soft p-3 text-xs text-muted">
          <summary class="cursor-pointer font-medium text-ink">Technical detail</summary>
          <p class="mt-2 whitespace-pre-wrap break-words">{{ error }}</p>
        </details>
        <button type="button" class="btn-secondary mt-4" @click="load">Try again</button>
      </div>

      <template v-else-if="data">
        <!-- Controls — shared by both charts below -->
        <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          <div class="flex flex-wrap items-center gap-3">
            <span class="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
              Metric
              <button
                type="button"
                class="grid size-4 place-items-center rounded-full border border-line-strong text-[10px] font-semibold leading-none text-muted transition-colors hover:border-ink hover:text-ink"
                :class="{ 'border-ink text-ink': showMetricHelp }"
                :aria-expanded="showMetricHelp"
                aria-label="What do these metrics mean?"
                @click="showMetricHelp = !showMetricHelp"
              >
                i
              </button>
            </span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="(m, key) in METRICS"
                :key="key"
                type="button"
                class="px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="metric === key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="metric = key"
              >
                {{ m.label }}
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Names</span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="opt in ['friendly', 'official']"
                :key="opt"
                type="button"
                class="px-3.5 py-1.5 text-sm font-medium capitalize transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="nameStyle === opt ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="nameStyle = opt"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <div v-if="bd.data.value?.available" class="flex flex-wrap items-center gap-3">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Breakdown</span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button
                v-for="opt in breakdownChoices"
                :key="opt"
                type="button"
                class="px-3.5 py-1.5 text-sm font-medium capitalize transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
                :class="breakdown === opt ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
                @click="breakdown = opt"
              >
                {{ BREAKDOWN_LABELS[opt] ?? opt }}
              </button>
            </div>
          </div>
        </div>

        <dl v-if="showMetricHelp" class="card space-y-2 text-xs text-muted">
          <div>
            <dt class="inline font-semibold text-ink">Deaths</dt>
            — the raw count. Rises with population size, so a bigger or older
            country shows more even if it isn't "deadlier."
          </div>
          <div>
            <dt class="inline font-semibold text-ink">Crude rate</dt>
            — deaths per 100,000 people. Controls for population size, but not
            for age: a place with more older residents looks worse for
            age-related causes.
          </div>
          <div>
            <dt class="inline font-semibold text-ink">Age-adjusted rate</dt>
            — deaths per 100,000, recalculated as if every year (or group) had
            the same age structure (the 2000 US standard population). Use this
            one to compare across time or between groups — differences reflect
            actual risk, not who happens to be older.
          </div>
        </dl>

        <!-- Stat callout -->
        <div v-if="primaryTop" class="card">
          <dt class="text-xs font-medium uppercase tracking-wide text-muted">
            Leading cause of death, {{ periodLabel(periods[0]) }}
          </dt>
          <dd class="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{{ label(primaryTop.cause) }}</dd>
          <dd class="mt-1 text-sm text-muted">
            {{ valueFormatter(primaryTop.value) }} {{ metricUnit }}
          </dd>
        </div>

        <!-- Ranked breakdown, with period comparison -->
        <section>
          <h2 class="mb-4 text-base font-semibold text-ink">Leading Causes, Ranked</h2>

          <!-- period controls -->
          <div class="mb-5 space-y-3">
            <div v-if="!breakdownActive" class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Add decade</span>
              <button
                v-for="b in decadeButtons"
                :key="b.key"
                type="button"
                class="badge min-h-[34px] px-3.5 py-1.5 transition-colors duration-150"
                :class="
                  b.available
                    ? 'cursor-pointer text-ink hover:border-ink'
                    : 'cursor-not-allowed opacity-40'
                "
                :disabled="!b.available || periods.length >= MAX_PERIODS"
                :title="
                  b.available
                    ? ''
                    : 'Ranked causes only go back to 1999 (the 113-cause list) — see Broad Chapters below for earlier trends'
                "
                @click="addPeriodFromDecade(b)"
              >
                {{ b.label }}
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium uppercase tracking-wide text-muted">
                {{ breakdownActive ? 'Period' : 'Periods' }}
              </span>
              <div
                v-for="(p, i) in periods"
                :key="i"
                class="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper py-1.5 pl-2 pr-1 text-sm"
              >
                <span
                  v-if="!breakdownActive"
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: SERIES[i % SERIES.length] }"
                  aria-hidden="true"
                ></span>
                <select
                  v-model.number="p.from"
                  class="min-h-[28px] bg-transparent py-0.5 text-ink focus-visible:outline-none"
                  aria-label="Period start year"
                >
                  <option v-for="y in data.years.filter((y) => y <= p.to)" :key="y" :value="y">
                    {{ y }}
                  </option>
                </select>
                <span class="text-muted">–</span>
                <select
                  v-model.number="p.to"
                  class="min-h-[28px] bg-transparent py-0.5 text-ink focus-visible:outline-none"
                  aria-label="Period end year"
                >
                  <option v-for="y in data.years.filter((y) => y >= p.from)" :key="y" :value="y">
                    {{ y }}
                  </option>
                </select>
                <button
                  v-if="periods.length > 1 && !breakdownActive"
                  type="button"
                  class="ml-1 rounded px-2 py-1 text-muted hover:bg-paper-soft hover:text-ink"
                  aria-label="Remove period"
                  @click="removePeriod(i)"
                >
                  ×
                </button>
              </div>
              <button
                v-if="!breakdownActive"
                type="button"
                class="btn-secondary px-2.5 py-1 text-xs"
                :disabled="periods.length >= MAX_PERIODS"
                @click="addPeriod"
              >
                + Add period
              </button>
            </div>

            <div v-if="breakdownActive" class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Show</span>
              <button
                v-for="sg in allSubgroups"
                :key="sg"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors"
                :class="
                  hiddenSubgroups.includes(sg)
                    ? 'border-line bg-paper text-muted line-through'
                    : 'border-line-strong bg-paper text-ink hover:border-ink'
                "
                :aria-pressed="!hiddenSubgroups.includes(sg)"
                @click="toggleSubgroup(sg)"
              >
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: subgroupStyle(sg).color }"
                  :class="{ 'opacity-30': hiddenSubgroups.includes(sg) }"
                  aria-hidden="true"
                ></span>
                {{ sg }}
              </button>
            </div>

            <p v-if="breakdownActive" class="text-xs text-muted">
              Comparing one period, split by {{ BREAKDOWN_LABELS[breakdown].toLowerCase() }}. Period
              comparison is paused — switch Breakdown back to None to overlay decades again.
            </p>
            <p v-if="breakdownActive && breakdown === 'race' && raceSeam" class="text-xs text-muted">
              Race categories change at 2021: 1999–2020 uses CDC's 4 bridged-race groups, 2021+ uses
              6 single-race groups (Asian and Pacific Islander split apart). Series across that seam
              aren't the same population.
            </p>
          </div>

          <div class="card">
            <RankedBarChart
              :labels="rankedLabels"
              :series="rankedSeries"
              :value-formatter="valueFormatter"
              :legend="!breakdownActive"
            />
            <ChartToolbar
              v-if="rankedTable"
              :columns="rankedTable.columns"
              :rows="rankedTable.rows"
              :note="rankedTable.note"
              filename="whywedie-leading-causes"
            />
          </div>
          <p v-if="breakdownActive" class="mt-3 text-xs text-muted">
            Top {{ TOP_N }} rankable ("113 Selected Causes") categories for {{ periodLabel(periods[0]) }},
            split by {{ BREAKDOWN_LABELS[breakdown].toLowerCase() }} (mean annual value). WONDER
            withholds any subgroup with 1–9 deaths, so some bars are missing for rarer causes.
            <template v-if="breakdown === 'race'">
              Race groups follow the CDC bridged-race categories used through 2020; compare them on
              the age-adjusted rate — crude rate mostly reflects differing age structures.
            </template>
          </p>
          <p v-else class="mt-3 text-xs text-muted">
            Top {{ TOP_N }} rankable ("113 Selected Causes") categories by {{ periodLabel(periods[0]) }},
            shown as the mean annual value for each period. National,
            {{ data.coverage.yearMin }}–{{ data.coverage.yearMax }}. The pre-1999 decades run at
            coarser ICD-chapter grain — see "Broad Chapters" below.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>

        <!-- Trend for one or more causes over time -->
        <section>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-ink">Trend Over Time</h2>
            <RangeTabs
              v-model="trendRange"
              :options="TREND_RANGES"
              aria-label="Trend time range"
            />
          </div>

          <div class="mb-5 flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Causes</span>
            <span
              v-for="(name, i) in trendCauses"
              :key="name"
              class="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper py-1.5 pl-2.5 pr-1 text-sm text-ink"
            >
              <span
                class="size-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: SERIES[i % SERIES.length] }"
                aria-hidden="true"
              ></span>
              {{ label(name) }}
              <button
                v-if="trendCauses.length > 1"
                type="button"
                class="rounded px-2 py-1 text-muted hover:bg-paper-soft hover:text-ink"
                aria-label="Remove cause"
                @click="removeTrendCause(i)"
              >
                ×
              </button>
            </span>
            <select
              v-if="trendCauses.length < MAX_TREND_CAUSES && availableTrendCauses.length"
              class="max-w-[15rem] rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink"
              @change="onAddCauseSelect"
            >
              <option value="">+ Add cause…</option>
              <option v-for="c in availableTrendCauses" :key="c" :value="c">{{ label(c) }}</option>
            </select>
          </div>

          <p v-if="breakdownActive" class="mb-4 text-xs text-muted">
            Charting <span class="text-ink">{{ label(trendBreakdownCause) }}</span> by
            {{ BREAKDOWN_LABELS[breakdown].toLowerCase()
            }}<template v-if="trendCauses.length > 1"> — one cause at a time in breakdown view</template>.
          </p>

          <div class="card">
            <TimeSeriesChart
              :labels="trendYearLabels"
              :series="trendWindowSeries"
              :value-formatter="valueFormatter"
            />
            <ChartToolbar
              v-if="trendTable"
              :columns="trendTable.columns"
              :rows="trendTable.rows"
              :note="trendTable.note"
              filename="whywedie-cause-trend"
            />
          </div>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>

        <!-- Broad ICD chapters — the full run, coarser than the 113 list -->
        <section v-if="chapters">
          <h2 class="mb-1 text-base font-semibold text-ink">Broad Chapters, {{ chapterSpan }}</h2>
          <p class="mb-4 text-xs text-muted">
            The same deaths as the ranked view, rolled all the way up to the ~19 ICD
            <em>chapters</em> — the one grouping that runs unbroken across every ICD revision
            (ICD-8 1968–1978, ICD-9 1979–1998, ICD-10 1999 on), so a chapter's line is continuous
            where the 113-cause list only reaches back to 1999 — with {{ chapterSeamText }} where the
            revisions change. Uses the metric selected above.
          </p>

          <div class="mb-5 flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted">Chapters</span>
            <span
              v-for="(name, i) in activeChapters"
              :key="name"
              class="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper py-1.5 pl-2.5 pr-1 text-sm text-ink"
            >
              <span
                class="size-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: SERIES[i % SERIES.length] }"
                aria-hidden="true"
              ></span>
              {{ name }}
              <button
                v-if="activeChapters.length > 1"
                type="button"
                class="rounded px-2 py-1 text-muted hover:bg-paper-soft hover:text-ink"
                aria-label="Remove chapter"
                @click="toggleChapter(name)"
              >
                ×
              </button>
            </span>
            <select
              v-if="activeChapters.length < MAX_CHAPTERS && availableChapters.length"
              class="max-w-[15rem] rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink"
              @change="onAddChapterSelect"
            >
              <option value="">+ Add chapter…</option>
              <option v-for="c in availableChapters" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div class="card">
            <TimeSeriesChart
              :labels="chapterYearLabels"
              :series="chapterSeries"
              :value-formatter="valueFormatter"
            />
            <ChartToolbar
              v-if="chapterTable"
              :columns="chapterTable.columns"
              :rows="chapterTable.rows"
              :note="chapterTable.note"
              filename="whywedie-icd-chapters"
            />
          </div>
          <p class="mt-3 text-xs text-muted">
            Chapter labels are normalised across ICD revisions (e.g. "External causes" covers ICD-8
            "Accidents, poisonings, and violence", ICD-9 "External causes of injury and poisoning"
            and ICD-10 "External causes of morbidity and mortality"). ICD-10's separate eye and ear
            chapters are folded back into "Nervous system &amp; sense organs"; "Special-purpose
            codes" is mostly COVID-19 (U07.1), which is why that line appears in 2020. The rules for
            assigning a death to a category changed at each revision, so pre-1999 figures aren't a
            strict 1:1 match to the ICD-10 ones — read the shape of a line, not the exact step at
            the 1979 or 1999 seam.
          </p>
          <p class="mt-1 text-xs text-muted">Source: {{ data.source }}.</p>
        </section>
      </template>
    </div>
  </div>
</template>
