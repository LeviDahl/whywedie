<script setup>
import { computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { datasetJsonLd } from '@/seo.js'
import PageHeader from '@/components/PageHeader.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import ChartToolbar from '@/components/ChartToolbar.vue'
import { useAsyncData } from '@/composables/useAsyncData.js'
import { fetchInjuryDeaths } from '@/api/injuryDeaths.js'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'injury-deaths')

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(
        datasetJsonLd({
          name: 'US suicide, homicide, and overdose deaths',
          description:
            'Annual United States suicide and homicide deaths since 1999, the share of each ' +
            'involving a firearm, and a rough drug-overdose figure. National, from CDC WONDER.',
          path: '/injury-deaths',
          temporal: '1999/..',
          keywords: [
            'US suicide rate',
            'suicide deaths by year',
            'gun deaths United States',
            'firearm suicide',
            'firearm homicide',
            'drug overdose deaths',
            'CDC injury deaths'
          ]
        })
      )
    }
  ]
})

const injury = useAsyncData(fetchInjuryDeaths)
onMounted(() => injury.load())

const integerFormatter = (v) => (v == null ? '—' : v.toLocaleString())

// --- Suicide ---------------------------------------------------------
const suicideSeries = computed(() => {
  const d = injury.data.value
  if (!d?.suicide) return null
  return {
    labels: d.suicide.years,
    series: [
      { label: 'Total', values: d.suicide.deaths },
      { label: 'By firearm', values: d.suicideFirearm?.deaths ?? [] }
    ]
  }
})
const suicideTable = computed(() => {
  const d = injury.data.value
  if (!d?.suicide) return null
  return {
    columns: ['Year', 'Total', 'By firearm'],
    rows: d.suicide.years.map((y, i) => [y, d.suicide.deaths[i], d.suicideFirearm?.deaths[i] ?? null])
  }
})
const suicideSummary = computed(() => {
  const d = injury.data.value
  if (!d?.suicide) return null
  const n = d.suicide.years.length
  const first = d.suicide.deaths[0]
  const last = d.suicide.deaths[n - 1]
  const lastFirearm = d.suicideFirearm?.deaths.at(-1)
  const share = lastFirearm != null && last ? Math.round((lastFirearm / last) * 100) : null
  return {
    firstYear: d.suicide.years[0],
    lastYear: d.suicide.years[n - 1],
    first,
    last,
    share
  }
})

// --- Homicide ---------------------------------------------------------
const homicideSeries = computed(() => {
  const d = injury.data.value
  if (!d?.homicide) return null
  return {
    labels: d.homicide.years,
    series: [
      { label: 'Total', values: d.homicide.deaths },
      { label: 'By firearm', values: d.homicideFirearm?.deaths ?? [] }
    ]
  }
})
const homicideTable = computed(() => {
  const d = injury.data.value
  if (!d?.homicide) return null
  return {
    columns: ['Year', 'Total', 'By firearm'],
    rows: d.homicide.years.map((y, i) => [y, d.homicide.deaths[i], d.homicideFirearm?.deaths[i] ?? null])
  }
})
const homicideSummary = computed(() => {
  const d = injury.data.value
  if (!d?.homicide) return null
  const n = d.homicide.years.length
  const last = d.homicide.deaths[n - 1]
  const lastFirearm = d.homicideFirearm?.deaths.at(-1)
  const share = lastFirearm != null && last ? Math.round((lastFirearm / last) * 100) : null
  return { lastYear: d.homicide.years[n - 1], last, share }
})

// --- Overdose (proxy) ---------------------------------------------------
const overdoseSeries = computed(() => {
  const d = injury.data.value
  if (!d?.overdoseProxy) return null
  return { labels: d.overdoseProxy.years, values: d.overdoseProxy.deaths }
})
const overdoseTable = computed(() => {
  const d = injury.data.value
  if (!d?.overdoseProxy) return null
  return {
    columns: ['Year', 'Accidental poisoning deaths'],
    rows: d.overdoseProxy.years.map((y, i) => [y, d.overdoseProxy.deaths[i]])
  }
})

const summary = computed(() => {
  const s = suicideSummary.value
  const h = homicideSummary.value
  if (!s || !h) return ''
  return (
    `US suicides rose from ${s.first?.toLocaleString()} in ${s.firstYear} to ` +
    `${s.last?.toLocaleString()} in ${s.lastYear}, about ${s.share}% of them involving a firearm. ` +
    `Homicides stood at ${h.last?.toLocaleString()} in ${h.lastYear}, about ${h.share}% by firearm.`
  )
})
</script>

<template>
  <div>
    <PageHeader eyebrow="Injury deaths" title="Suicide, Homicide & Overdose Deaths" :description="section.description" />

    <div class="mx-auto max-w-4xl space-y-12 px-6 py-10 sm:px-10">
      <p v-if="summary" class="max-w-2xl text-base leading-relaxed text-ink-soft">
        {{ summary }}
      </p>

      <!-- Suicide -->
      <section>
        <h2 class="mb-4 text-base font-semibold text-ink">Suicide</h2>
        <div v-if="injury.loading.value" class="card flex items-center justify-center py-20 text-sm text-muted">
          Loading…
        </div>
        <div v-else-if="injury.error.value" class="card border-line-strong">
          <p class="text-sm font-semibold text-ink">Couldn't load this chart</p>
          <button type="button" class="btn-secondary mt-4" @click="injury.load">Try again</button>
        </div>
        <template v-else-if="suicideSeries">
          <div class="card">
            <TimeSeriesChart
              :labels="suicideSeries.labels"
              :series="suicideSeries.series"
              :value-formatter="integerFormatter"
              aria-label="Line chart: US suicide deaths by year since 1999, total and by firearm."
              png-name="whywedie-suicide-deaths"
              png-source="CDC WONDER"
            />
            <ChartToolbar
              v-if="suicideTable"
              :columns="suicideTable.columns"
              :rows="suicideTable.rows"
              filename="whywedie-suicide-deaths"
              embed-slug="suicide-deaths"
            />
          </div>
          <p class="mt-3 text-xs text-muted">Source: {{ injury.data.value.source }}.</p>
        </template>
      </section>

      <!-- Homicide -->
      <section>
        <h2 class="mb-4 text-base font-semibold text-ink">Homicide</h2>
        <template v-if="homicideSeries">
          <div class="card">
            <TimeSeriesChart
              :labels="homicideSeries.labels"
              :series="homicideSeries.series"
              :value-formatter="integerFormatter"
              aria-label="Line chart: US homicide deaths by year since 1999, total and by firearm."
              png-name="whywedie-homicide-deaths"
              png-source="CDC WONDER"
            />
            <ChartToolbar
              v-if="homicideTable"
              :columns="homicideTable.columns"
              :rows="homicideTable.rows"
              filename="whywedie-homicide-deaths"
              embed-slug="homicide-deaths"
            />
          </div>
        </template>
      </section>

      <!-- Overdose (proxy) -->
      <section>
        <h2 class="mb-2 text-base font-semibold text-ink">Drug Overdose (approximate)</h2>
        <p class="mb-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          This isn't CDC's published "drug overdose deaths" figure — it's the closest stand-in
          available today, "accidental poisoning" deaths, which misses overdoses ruled a suicide
          or of undetermined intent, and includes a small number of non-drug poisonings. The last
          two years are shown muted: overdose deaths take longer to certify than most, so recent
          provisional counts run low and typically get revised upward.
        </p>
        <template v-if="overdoseSeries">
          <div class="card">
            <TimeSeriesChart
              :labels="overdoseSeries.labels"
              :values="overdoseSeries.values"
              series-label="Accidental poisoning deaths"
              :value-formatter="integerFormatter"
              :muted-points="injury.data.value.overdoseMuted"
              muted-label="provisional, likely undercounted"
              aria-label="Line chart: US accidental poisoning deaths by year since 1999, a rough proxy for drug overdose deaths."
              png-name="whywedie-overdose-proxy"
              png-source="CDC WONDER"
            />
            <ChartToolbar
              v-if="overdoseTable"
              :columns="overdoseTable.columns"
              :rows="overdoseTable.rows"
              filename="whywedie-overdose-proxy"
            />
          </div>
        </template>
      </section>

      <p class="border-t border-line pt-6 text-xs text-muted">
        Figures are national underlying-cause-of-death counts from CDC WONDER (the NCHS 113-cause
        list), 1999–present. "By firearm" sums suicide and homicide deaths coded as caused by a
        firearm discharge; it doesn't include unintentional or undetermined-intent firearm deaths,
        so it runs a little under CDC's own published firearm-death total. Nothing here is
        individual-level: CDC suppresses any figure based on 1 to 9 deaths.
      </p>
    </div>
  </div>
</template>
