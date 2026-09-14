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
import { STATE_GRID, GRID_COLS, GRID_ROWS } from '@/data/usStateGrid.js'

ChartJS.register(BubbleController, PointElement, LinearScale, Tooltip)

// A "finviz-style" tile grid map: every state sits in its real rough
// geographic slot (STATE_GRID — always the full 51, so the US shape never
// has holes), but each tile's SIZE and colour both scale with its rate for
// whichever cause is selected — the highest state for that cause visibly
// dominates the grid, the way a market-cap treemap makes big companies
// big. Built on Chart.js's native `bubble` type (x/y/r per point) rather
// than hand-rolled canvas, so hover tooltips, PNG export, and responsive
// resize all come from the same machinery every other chart on this site
// already uses.
const props = defineProps({
  // [{ label: stateName, rate: number }] — states missing from this list
  // (suppressed / no data this quarter) still render, as a minimal
  // neutral placeholder, so the map never has an unexplained gap.
  states: { type: Array, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' },
  ariaLabel: { type: String, default: '' },
  pngName: { type: String, default: 'whywedie-state-grid' },
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

let ro = null
onMounted(() => {
  ro = new ResizeObserver(() => {
    const c = chartRef.value?.chart
    const w = wrapRef.value?.clientWidth || 0
    if (c && w > 0 && Math.abs((c.canvas?.clientWidth || 0) - w) > 1) {
      c.resize()
    }
  })
  if (wrapRef.value) ro.observe(wrapRef.value)
})
onBeforeUnmount(() => ro?.disconnect())

const MIN_R = 7
const MAX_R = 26

const points = computed(() => {
  const byState = new Map(props.states.map((s) => [s.label, s.rate]))
  const maxRate = Math.max(0, ...props.states.map((s) => s.rate).filter((r) => r != null))
  return STATE_GRID.map((g) => {
    const rate = byState.get(g.name) ?? null
    const t = rate != null && maxRate > 0 ? rate / maxRate : 0
    const r = rate != null ? MIN_R + (MAX_R - MIN_R) * Math.sqrt(t) : MIN_R * 0.55
    return {
      x: g.col,
      y: g.row,
      r,
      name: g.name,
      abbr: g.abbr,
      rate,
      backgroundColor: rate != null ? sequentialFor(t) : '#f0f0f0',
      borderColor: rate != null ? sequentialFor(Math.min(1, t + 0.15)) : '#d4d4d4'
    }
  })
})

// Draws each state's abbreviation centered on its tile — Chart.js has no
// built-in per-point text label, so this is a small custom plugin rather
// than a new dependency for one draw call.
const stateLabels = {
  id: 'stateLabels',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0)
    const ctx = chart.ctx
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#171717'
    meta.data.forEach((el, i) => {
      const p = points.value[i]
      if (!p) return
      const size = Math.max(9, Math.min(12, el.options.radius * 0.6))
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
      backgroundColor: points.value.map((p) => p.backgroundColor),
      borderColor: points.value.map((p) => p.borderColor),
      borderWidth: 1.5
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: GRID_COLS / GRID_ROWS,
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
    x: { display: false, min: -0.6, max: GRID_COLS - 0.4, offset: false },
    y: { display: false, min: -0.6, max: GRID_ROWS - 0.4, reverse: true, offset: false }
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
    <Chart ref="chartRef" type="bubble" :data="chartData" :options="chartOptions" :plugins="[stateLabels]" />
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
