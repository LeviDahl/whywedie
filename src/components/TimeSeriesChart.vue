<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import {
  SERIES,
  SERIES_DASH,
  fillFor,
  GRID_LINE,
  AXIS_TEXT,
  MUTED_MARK,
  TOOLTIP_BG
} from '@/charts/palette.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({
  labels: { type: Array, required: true },
  // Single-series form (unchanged): pass `values` + `seriesLabel`.
  values: { type: Array, default: null },
  seriesLabel: { type: String, default: '' },
  // Multi-series form: pass `series` = [{ label, values, muted? }]. When set,
  // `values`/`seriesLabel` are ignored and a legend is shown.
  series: { type: Array, default: null },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' },
  // Single-series only: booleans same length as `values` — points flagged
  // true (e.g. a partial period) render muted gray as a "don't over-read" cue.
  mutedPoints: { type: Array, default: () => [] }
})

const normalized = computed(() => {
  if (props.series && props.series.length) {
    return props.series.map((s, i) => ({
      label: s.label ?? `Series ${i + 1}`,
      values: s.values,
      color: SERIES[i % SERIES.length],
      dash: SERIES_DASH[i % SERIES_DASH.length],
      fill: props.series.length === 1,
      mutedPoints: s.muted ?? []
    }))
  }
  return [
    {
      label: props.seriesLabel,
      values: props.values ?? [],
      color: SERIES[0],
      dash: [],
      fill: true,
      mutedPoints: props.mutedPoints
    }
  ]
})

const multi = computed(() => normalized.value.length > 1)

const chartData = computed(() => ({
  labels: props.labels.map(String),
  datasets: normalized.value.map((s) => ({
    label: s.label,
    data: s.values,
    borderColor: s.color,
    borderDash: s.dash,
    backgroundColor: multi.value ? 'transparent' : fillFor(s.color, 0.1),
    pointBackgroundColor: s.values.map((_, i) => (s.mutedPoints[i] ? MUTED_MARK : s.color)),
    pointBorderColor: '#ffffff',
    pointBorderWidth: 1.5,
    pointRadius: multi.value ? 2.5 : 3,
    pointHoverRadius: 5.5,
    borderWidth: 2,
    tension: 0.25,
    fill: s.fill,
    spanGaps: false
  }))
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: multi.value,
      position: 'bottom',
      labels: {
        color: '#171717',
        boxWidth: 22,
        boxHeight: 2,
        usePointStyle: false,
        font: { size: 11 }
      }
    },
    tooltip: {
      backgroundColor: TOOLTIP_BG,
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      cornerRadius: 6,
      displayColors: multi.value,
      titleFont: { weight: '600' },
      callbacks: {
        title: (items) => items[0]?.label,
        label: (item) => {
          const s = normalized.value[item.datasetIndex]
          const suffix = s?.mutedPoints[item.dataIndex] ? ' (partial)' : ''
          const name = multi.value ? `${item.dataset.label}: ` : `${props.seriesLabel}: `
          return `${name}${props.valueFormatter(item.parsed.y)}${suffix}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: AXIS_TEXT, maxRotation: 0, autoSkipPadding: 16 }
    },
    y: {
      beginAtZero: false,
      grid: { color: GRID_LINE },
      ticks: {
        color: AXIS_TEXT,
        callback: (value) => props.valueFormatter(value)
      }
    }
  }
}))
</script>

<template>
  <div class="h-72 sm:h-96">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
