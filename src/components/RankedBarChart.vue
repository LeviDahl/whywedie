<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

// Horizontal ranked bar chart — built for "leading causes of death" style
// breakdowns where the labels are category names (not a time axis), so a
// horizontal layout keeps category labels readable without rotating text.
const props = defineProps({
  labels: { type: Array, required: true },
  values: { type: Array, required: true },
  seriesLabel: { type: String, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' }
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.seriesLabel,
      data: props.values,
      backgroundColor: '#0a0a0a',
      borderRadius: 4,
      maxBarThickness: 22
    }
  ]
}))

const chartOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0a0a0a',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      cornerRadius: 6,
      displayColors: false,
      callbacks: {
        title: (items) => items[0]?.label,
        label: (item) => `${props.seriesLabel}: ${props.valueFormatter(item.parsed.x)}`
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
      ticks: { color: '#171717', font: { weight: '500' } }
    }
  }
}))
</script>

<template>
  <div :style="{ height: Math.max(labels.length * 40, 200) + 'px' }">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
