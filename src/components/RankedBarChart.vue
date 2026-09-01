<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Horizontal ranked bar chart. `labels` are category names (causes). Pass
// one or more series in `series` = [{ label, values }]; with more than one,
// bars are grouped per category and a legend is shown — this is how the
// "compare periods" overlay works.
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' }
})

// Grayscale ramp for up to ~5 overlaid periods.
const FILLS = ['#0a0a0a', '#525252', '#8a8a8a', '#b8b8b8', '#d4d4d4']

const multi = computed(() => props.series.length > 1)

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s, i) => ({
    label: s.label,
    data: s.values,
    backgroundColor: FILLS[i % FILLS.length],
    borderRadius: 3,
    maxBarThickness: multi.value ? 14 : 22
  }))
}))

const chartOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: multi.value,
      position: 'bottom',
      labels: { color: '#171717', boxWidth: 12, boxHeight: 12, font: { size: 11 } }
    },
    tooltip: {
      backgroundColor: '#0a0a0a',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      cornerRadius: 6,
      displayColors: multi.value,
      callbacks: {
        title: (items) => items[0]?.label,
        label: (item) =>
          `${multi.value ? item.dataset.label : props.series[0]?.label ?? ''}: ${props.valueFormatter(
            item.parsed.x
          )}`
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: '#e5e5e5' },
      ticks: { color: '#737373', callback: (value) => props.valueFormatter(value) }
    },
    y: {
      grid: { display: false },
      ticks: { color: '#171717', font: { weight: '500' }, autoSkip: false }
    }
  }
}))

const heightPx = computed(() => {
  const perRow = multi.value ? 20 + props.series.length * 16 : 40
  return Math.max(props.labels.length * perRow, 200)
})
</script>

<template>
  <div :style="{ height: heightPx + 'px' }">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
