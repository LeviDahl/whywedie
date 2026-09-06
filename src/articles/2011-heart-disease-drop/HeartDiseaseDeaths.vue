<script setup>
// Article figure: US heart-disease mortality, 2006-2025. `metric` picks
// the series — total deaths or the age-adjusted rate per 100,000. Numbers
// are a fixed slice of /data/mortality.json ("Diseases of heart", I00-I09,
// I11, I13, I20-I51) so the figure renders without a fetch. Refresh them
// from the snapshot if the story gets revised.
import { computed } from 'vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'

const props = defineProps({
  metric: { type: String, default: 'deaths' } // 'deaths' | 'rate'
})

const YEARS = [
  2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
]
const DEATHS = [
  631636, 616067, 616828, 599413, 597689, 596577, 599711, 611105, 614348, 633842,
  635260, 647457, 655381, 659041, 696962, 695547, 702880, 680981, 683491, 695899
]
const AGE_ADJUSTED_RATE = [
  205.5, 196.1, 192.1, 182.8, 179.1, 173.7, 170.5, 169.8, 167.0, 168.5,
  165.5, 165.0, 163.6, 161.5, 168.2, 173.8, 167.2, 162.1, 157.6, 160.3
]
// 2024-2025 are still CDC provisional.
const MUTED = YEARS.map((y) => y >= 2024)

const isRate = computed(() => props.metric === 'rate')
const values = computed(() => (isRate.value ? AGE_ADJUSTED_RATE : DEATHS))
const seriesLabel = computed(() =>
  isRate.value ? 'Age-adjusted rate per 100,000' : 'Deaths'
)
const valueFormatter = computed(() =>
  isRate.value
    ? (v) => (v == null ? '—' : v.toFixed(1))
    : (v) => v?.toLocaleString() ?? '—'
)
</script>

<template>
  <TimeSeriesChart
    :labels="YEARS"
    :values="values"
    :series-label="seriesLabel"
    :value-formatter="valueFormatter"
    :muted-points="MUTED"
    muted-label="provisional"
  />
</template>
