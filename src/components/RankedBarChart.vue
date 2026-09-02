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
import { SERIES, GRID_LINE, AXIS_TEXT, TOOLTIP_BG } from '@/charts/palette.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Horizontal ranked bar chart. `labels` are category names (causes). Pass
// one or more series in `series` = [{ label, values }]; with more than one,
// bars are grouped per category, coloured per series, and a legend is shown
// — this is how the "compare periods" overlay works.
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' },
  // Suppress the built-in legend when the caller shows its own key
  // (e.g. the interactive Show chips on the breakdown view).
  legend: { type: Boolean, default: true }
})

const multi = computed(() => props.series.length > 1)
const showLegend = computed(() => props.legend && multi.value)

// Wrap a category label onto at most `maxLines` lines of ~`maxChars` each,
// so long cause names stay readable on a narrow (phone) viewport instead of
// being clipped by Chart.js. Returns a string or string[] (Chart.js renders
// an array as stacked lines). The tooltip still shows the full label.
function wrapLabel(text, maxChars = 20, maxLines = 2) {
  if (text.length <= maxChars) return text
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  let i = 0
  for (; i < words.length; i++) {
    const next = line ? line + ' ' + words[i] : words[i]
    if (next.length <= maxChars) {
      line = next
    } else {
      if (line) lines.push(line)
      line = words[i]
      if (lines.length === maxLines - 1) break
    }
  }
  // whatever's left (current `line` + any untried words) goes on the last line
  let last = [line, ...words.slice(i + 1)].filter(Boolean).join(' ')
  if (last.length > maxChars) last = last.slice(0, maxChars - 1).trimEnd() + '…'
  lines.push(last)
  return lines
}

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s, i) => ({
    label: s.label,
    data: s.values,
    // `s.color` lets the caller pin a colour to an entity so hiding one
    // series doesn't repaint the others; falls back to slot order.
    backgroundColor: s.color ?? SERIES[i % SERIES.length],
    borderRadius: 4,
    borderSkipped: 'start',
    maxBarThickness: multi.value ? 14 : 22
  }))
}))

const chartOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: showLegend.value,
      // top, not bottom: this chart is tall (15 rows), and the legend is
      // how you read which colour is which period / subgroup — it
      // shouldn't require scrolling past the whole chart to reach.
      position: 'top',
      align: 'start',
      labels: { color: '#171717', boxWidth: 12, boxHeight: 12, font: { size: 11 } }
    },
    tooltip: {
      backgroundColor: TOOLTIP_BG,
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
      grid: { color: GRID_LINE },
      ticks: { color: AXIS_TEXT, callback: (value) => props.valueFormatter(value) }
    },
    y: {
      grid: { display: false },
      ticks: {
        color: '#171717',
        font: { weight: '500', size: 11 },
        autoSkip: false,
        crossAlign: 'far',
        callback(value) {
          return wrapLabel(this.getLabelForValue(value), 20, 2)
        }
      }
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
