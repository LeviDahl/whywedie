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
  Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const props = defineProps({
  labels: { type: Array, required: true },
  values: { type: Array, required: true },
  seriesLabel: { type: String, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' },
  // Optional array of booleans, same length as values — points flagged true
  // (e.g. a partial/incomplete period) render in a muted gray instead of
  // solid black, as a visual "don't over-read this one" cue.
  mutedPoints: { type: Array, default: () => [] }
})

const pointColor = (i) => (props.mutedPoints[i] ? '#a3a3a3' : '#0a0a0a')

const chartData = computed(() => ({
  labels: props.labels.map(String),
  datasets: [
    {
      label: props.seriesLabel,
      data: props.values,
      borderColor: '#0a0a0a',
      backgroundColor: 'rgba(10, 10, 10, 0.06)',
      pointBackgroundColor: props.values.map((_, i) => pointColor(i)),
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1.5,
      pointRadius: 3,
      pointHoverRadius: 5.5,
      borderWidth: 2,
      tension: 0.25,
      fill: true
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0a0a0a',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      cornerRadius: 6,
      displayColors: false,
      titleFont: { weight: '600' },
      callbacks: {
        title: (items) => items[0]?.label,
        label: (item) => {
          const suffix = props.mutedPoints[item.dataIndex] ? ' (partial)' : ''
          return `${props.seriesLabel}: ${props.valueFormatter(item.parsed.y)}${suffix}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#737373', maxRotation: 0, autoSkipPadding: 16 }
    },
    y: {
      beginAtZero: false,
      grid: { color: '#e5e5e5' },
      ticks: {
        color: '#737373',
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
