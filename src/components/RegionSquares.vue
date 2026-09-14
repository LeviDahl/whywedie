<script setup>
import { computed, ref } from 'vue'
import { sequentialFor } from '@/charts/palette.js'

// A small, fixed set of squares (Census regions) laid out on a real CSS
// grid rather than Chart.js's bubble/rect points — TileGridMap.vue (used
// for the 51-state map) hit a genuine Chart.js quirk here: with only 4
// very large points, some rendered visibly bigger than others despite an
// identical `r` on every point (reproduced, not a hover/animation
// artifact — see the investigation in CLAUDE.md). A CSS grid can't
// overlap or mis-size a cell by construction, which sidesteps needing to
// fully root-cause that quirk for a case this simple.
const props = defineProps({
  // [{ name, abbr, col, row }] — a small grid (e.g. 3x2).
  grid: { type: Array, required: true },
  gridCols: { type: Number, required: true },
  gridRows: { type: Number, required: true },
  // [{ label, rate }] — `label` must match a `grid` entry's `name`.
  items: { type: Array, required: true },
  valueFormatter: { type: Function, default: (v) => v?.toLocaleString() ?? '—' }
})

const hovered = ref(null)

const tiles = computed(() => {
  const byName = new Map(props.items.map((s) => [s.label, s.rate]))
  const rates = props.items.map((s) => s.rate).filter((r) => r != null)
  const minRate = rates.length ? Math.min(...rates) : 0
  const maxRate = rates.length ? Math.max(...rates) : 0
  const span = maxRate - minRate
  return props.grid.map((g) => {
    const rate = byName.get(g.name) ?? null
    const t = rate != null && span > 0 ? (rate - minRate) / span : rate != null ? 1 : 0
    return { ...g, rate, t }
  })
})
</script>

<template>
  <div
    class="grid gap-1.5"
    :style="{
      gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
      gridTemplateRows: `repeat(${gridRows}, 1fr)`
    }"
  >
    <div
      v-for="tile in tiles"
      :key="tile.name"
      class="relative flex aspect-square items-center justify-center rounded-md text-sm font-semibold transition-transform duration-150"
      :class="hovered === tile.name ? 'scale-[1.03]' : ''"
      :style="{
        gridColumn: tile.col + 1,
        gridRow: tile.row + 1,
        backgroundColor: tile.rate != null ? sequentialFor(tile.t) : '#f0f0f0',
        color: tile.t > 0.6 ? '#f5f5f5' : '#171717'
      }"
      @mouseenter="hovered = tile.name"
      @mouseleave="hovered = null"
    >
      {{ tile.abbr }}
      <div
        v-if="hovered === tile.name"
        class="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full
               whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-normal text-paper shadow-lg"
      >
        <span class="font-semibold">{{ tile.name }}</span>
        {{ tile.rate != null ? `${valueFormatter(tile.rate)} per 100,000` : 'No data this quarter' }}
      </div>
    </div>
  </div>
</template>
