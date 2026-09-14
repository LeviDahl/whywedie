<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BubbleController,
  PointElement,
  LinearScale,
  Tooltip
} from 'chart.js'
import { chartToPngDataUrl, downloadDataUrl } from '@/lib/chartImage.js'
import { trackEvent } from '@/lib/analytics.js'
import { sequentialFor, TOOLTIP_BG } from '@/charts/palette.js'

ChartJS.register(BubbleController, PointElement, LinearScale, Tooltip)

// A filled tile grid — every cell in `grid` gets a solid square, sized to
// fill/touch its neighbors (so the shape reads as one connected map, not
// floating dots), coloured by its value. Color only — no size-by-value —
// after that combination read as harder to compare than color alone once
// actually looked at ("drop the size"). Used for both State Comparison's
// state map (12x8, real US geography) and its region map (3x2, roughly
// compass-shaped) — same mechanic, different grid.
//
// Built on Chart.js's native `bubble` type (x/y/r per point) with a
// squared-off `pointStyle: 'rect'`, rather than hand-rolled canvas,
// specifically so hover tooltips, PNG export, and responsive resize all
// come from the same machinery every other chart on this site uses; only
// the per-tile abbreviation label needs a small custom draw plugin.
const props = defineProps({
  // [{ name, abbr, col, row }] — every cell always renders, even ones
  // missing from `items`, as a minimal neutral placeholder, so the shape
  // never has an unexplained gap.
  grid: { type: Array, required: true },
  gridCols: { type: Number, required: true },
  gridRows: { type: Number, required: true },
  // [{ label, rate }] — `label` must match a `grid` entry's `name`.
  items: { type: Array, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' },
  ariaLabel: { type: String, default: '' },
  pngName: { type: String, default: 'whywedie-tile-grid' },
  pngSource: { type: String, default: '' }
})

const chartRef = ref(null)
const wrapRef = ref(null)
function savePng() {
  const chart = chartRef.value?.chart
  const url = chartToPngDataUrl(chart, { source: props.pngSource })
  downloadDataUrl(props.pngName, url)
  if (url) trackEvent('png_download', { chart: props.pngName })
}

// A `bubble` chart takes its radius from each data point's own `r` field,
// not a dataset-level option — so "how big should a tile be" is measured
// straight from the container's own width (which we're already watching
// for the iframe-resize fix below) rather than from Chart.js's scales,
// which aren't reliably readable at the point where radius needs to be
// known. cellPx = one grid cell's width, assuming the chart's fixed
// aspectRatio (gridCols/gridRows) keeps rows the same size as columns.
const containerWidth = ref(0)
const cellRadius = computed(() => {
  const usableWidth = containerWidth.value - 16 // roughly the chart's own layout padding
  const cellPx = usableWidth > 0 ? usableWidth / props.gridCols : 0
  // Chart.js's `rect` point style draws a square whose AREA matches a
  // circle of the given radius (area = pi * r^2), not one whose SIDE
  // equals the radius — so a square that actually fills a cell needs
  // radius = cellPx / sqrt(pi), not cellPx itself (verified empirically:
  // without this the "filled" squares had visible gaps between them).
  return cellPx > 0 ? (cellPx / Math.sqrt(Math.PI)) * 0.94 : 10 // *0.94: a hairline gap so tiles read as separate
})

let ro = null
onMounted(() => {
  containerWidth.value = wrapRef.value?.clientWidth || 0
  ro = new ResizeObserver(() => {
    const c = chartRef.value?.chart
    const w = wrapRef.value?.clientWidth || 0
    containerWidth.value = w
    if (c && w > 0 && Math.abs((c.canvas?.clientWidth || 0) - w) > 1) {
      c.resize()
    }
  })
  if (wrapRef.value) ro.observe(wrapRef.value)
})
onBeforeUnmount(() => ro?.disconnect())

const points = computed(() => {
  const byName = new Map(props.items.map((s) => [s.label, s.rate]))
  const rates = props.items.map((s) => s.rate).filter((r) => r != null)
  const minRate = rates.length ? Math.min(...rates) : 0
  const maxRate = rates.length ? Math.max(...rates) : 0
  const span = maxRate - minRate
  return props.grid.map((g) => {
    const rate = byName.get(g.name) ?? null
    // Normalized against the DATA'S OWN min-max, not against zero — a
    // rate metric never gets close to 0, so flooring at 0 squeezes every
    // real entry into a narrow band near the top of the scale.
    const t = rate != null && span > 0 ? (rate - minRate) / span : rate != null ? 1 : 0
    return { x: g.col, y: g.row, r: cellRadius.value, name: g.name, abbr: g.abbr, rate, t }
  })
})

// Draws each cell's abbreviation centered on its tile — Chart.js has no
// built-in per-point text label, so this is a small custom plugin rather
// than a new dependency for one draw call.
const tileLabels = {
  id: 'tileLabels',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0)
    const ctx = chart.ctx
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    meta.data.forEach((el, i) => {
      const p = points.value[i]
      if (!p) return
      // Dark tiles at the top of the scale need light text, not the ink
      // colour every other label on the site uses.
      ctx.fillStyle = p.t > 0.6 ? '#f5f5f5' : '#171717'
      const size = Math.max(9, Math.min(13, p.r * 0.55))
      ctx.font = `${p.rate != null ? 600 : 400} ${size}px system-ui, -apple-system, sans-serif`
      ctx.fillText(p.abbr, el.x, el.y)
    })
    ctx.restore()
  }
}

const chartData = computed(() => ({
  datasets: [
    {
      data: points.value,
      pointStyle: 'rect',
      backgroundColor: points.value.map((p) => (p.rate != null ? sequentialFor(p.t) : '#f0f0f0')),
      borderColor: points.value.map((p) => (p.rate != null ? sequentialFor(Math.min(1, p.t + 0.1)) : '#d4d4d4')),
      borderWidth: 1
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: props.gridCols / props.gridRows,
  layout: { padding: 8 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: TOOLTIP_BG,
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 10,
      cornerRadius: 6,
      displayColors: false,
      callbacks: {
        title: (items) => items[0]?.raw?.name ?? '',
        label: (item) =>
          item.raw?.rate != null
            ? `${props.valueFormatter(item.raw.rate)} per 100,000`
            : 'No data this quarter'
      }
    }
  },
  scales: {
    x: { display: false, min: -0.6, max: props.gridCols - 0.4, offset: false },
    y: { display: false, min: -0.6, max: props.gridRows - 0.4, reverse: true, offset: false }
  }
}))
</script>

<template>
  <div
    ref="wrapRef"
    class="group relative"
    :role="ariaLabel ? 'img' : undefined"
    :aria-label="ariaLabel || undefined"
  >
    <Chart ref="chartRef" type="bubble" :data="chartData" :options="chartOptions" :plugins="[tileLabels]" />
    <button
      type="button"
      class="absolute right-0 top-0 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px]
             font-medium text-muted-soft opacity-0 transition-opacity hover:text-ink
             focus-visible:opacity-100 group-hover:opacity-100"
      aria-label="Save this chart as a PNG image"
      @click="savePng"
    >
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />
      </svg>
      PNG
    </button>
  </div>
</template>
