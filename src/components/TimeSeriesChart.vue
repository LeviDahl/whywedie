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
  // Booleans same length as `values` — points flagged true (a provisional
  // or incomplete period) render muted grey as a "don't over-read" cue.
  mutedPoints: { type: Array, default: () => [] },
  // Word shown after a muted point's value in the tooltip.
  mutedLabel: { type: String, default: 'provisional' },
  // Optional context bands drawn behind the line, keyed to the x (year)
  // axis: [{ from, to, label }]. Faint alternating fill + a divider and a
  // small label per span. Used for the Pew generation cohorts on the
  // annual-births chart. A band with `active: true` is emphasised.
  bands: { type: Array, default: () => [] }
})

// Emitted when a band is clicked (the whole band object). Lets a parent
// "drill down" into a cohort. Only wired when `bands` is non-empty.
const emit = defineEmits(['bandClick'])

const normalized = computed(() => {
  if (props.series && props.series.length) {
    return props.series.map((s, i) => ({
      label: s.label ?? `Series ${i + 1}`,
      values: s.values,
      // caller may pin colour/dash to an entity (see RankedBarChart note)
      color: s.color ?? SERIES[i % SERIES.length],
      dash: s.dash ?? SERIES_DASH[i % SERIES_DASH.length],
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

// Draws `props.bands` as faint spans behind the datasets. `from`/`to` are
// years; the x scale is categorical (year strings), so a boundary maps to
// the edge between two year categories, clamped to the visible chart area.
const bandsPlugin = computed(() => ({
  id: 'contextBands',
  beforeDatasetsDraw(chart) {
    const bands = props.bands
    if (!bands?.length) return
    const { ctx, chartArea: area, scales } = chart
    const x = scales.x
    if (!x) return
    const years = props.labels.map((l) => Number(l))
    const first = years[0]
    const last = years[years.length - 1]
    const step = years.length > 1 ? (x.getPixelForValue(1) - x.getPixelForValue(0)) : area.width
    const edge = (year, side) => {
      if (year <= first) return area.left
      if (year > last) return area.right
      // left edge of `year`'s category = halfway between it and the prior one
      const px = x.getPixelForValue(year - first) - step / 2
      return Math.min(Math.max(px, area.left), area.right)
    }
    const anyActive = bands.some((b) => b.active)
    ctx.save()
    bands.forEach((b, i) => {
      const left = edge(b.from, 'l')
      const right = edge(b.to + 1, 'r')
      if (right - left < 1) return
      const fill = b.active
        ? 'rgba(23,23,23,0.08)'
        : anyActive
          ? null
          : i % 2 === 1
            ? 'rgba(23,23,23,0.04)'
            : null
      if (fill) {
        ctx.fillStyle = fill
        ctx.fillRect(left, area.top, right - left, area.height)
      }
      if (b.from > first) {
        ctx.strokeStyle = GRID_LINE
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(left, area.top)
        ctx.lineTo(left, area.bottom)
        ctx.stroke()
      }
      if (right - left > 46 && b.label) {
        ctx.fillStyle = b.active ? '#171717' : AXIS_TEXT
        ctx.font = `${b.active ? 700 : 600} 10px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(b.label.toUpperCase(), (left + right) / 2, area.top + 4)
      }
    })
    ctx.restore()
  }
}))

// A line segment counts as "provisional" if the point it draws *into* is
// flagged — so the run of provisional years at the end renders dimmed.
// Single-series lines are solid, so provisional segments go dashed+grey.
// Multi-series lines already carry a dash for identity, so provisional
// segments there go SOLID grey instead — a clear break against the pattern.
const PROVISIONAL_DASH = [5, 4]
const segmentStyle = (s, multi) => ({
  borderDash: (ctx) =>
    s.mutedPoints[ctx.p1DataIndex] ? (multi ? [] : PROVISIONAL_DASH) : undefined,
  borderColor: (ctx) => (s.mutedPoints[ctx.p1DataIndex] ? MUTED_MARK : undefined)
})

const chartData = computed(() => ({
  labels: props.labels.map(String),
  datasets: normalized.value.map((s) => {
    const hasMuted = s.mutedPoints.some(Boolean)
    return {
      label: s.label,
      data: s.values,
      borderColor: s.color,
      borderDash: s.dash,
      segment: hasMuted ? segmentStyle(s, multi.value) : undefined,
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
    }
  })
}))

// Categorical x scale — map an event's pixel to the year under it, then to
// the band that contains that year (or null).
function bandAtEvent(evt, chart) {
  const idx = chart.scales.x?.getValueForPixel?.(evt.x)
  if (idx == null) return null
  const year = Number(props.labels[Math.round(idx)])
  return props.bands.find((b) => year >= b.from && year <= b.to) ?? null
}

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  // Click inside a band → emit it (drill-down); pointer cursor while over one.
  onClick: props.bands.length
    ? (evt, _els, chart) => {
        const b = bandAtEvent(evt, chart)
        if (b) emit('bandClick', b)
      }
    : undefined,
  onHover: props.bands.length
    ? (evt, els, chart) => {
        const t = evt.native?.target
        if (t) t.style.cursor = bandAtEvent(evt, chart) ? 'pointer' : 'default'
      }
    : undefined,
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
          const suffix = s?.mutedPoints[item.dataIndex] ? ` (${props.mutedLabel})` : ''
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
    <Line :data="chartData" :options="chartOptions" :plugins="[bandsPlugin]" />
  </div>
</template>
