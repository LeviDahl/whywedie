<script setup>
import { computed, ref } from 'vue'

// Simple sortable table for the data behind a chart. `rows` are
// array-of-arrays or objects keyed by `columns`.
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  maxRows: { type: Number, default: 60 }
})

const sortCol = ref(-1)
const sortDir = ref(1)

function cell(row, i) {
  return Array.isArray(row) ? row[i] : row[props.columns[i]]
}
function fmt(v, i) {
  if (v == null || v === '') return '—'
  if (typeof v !== 'number') return v
  // don't put thousands separators on a year in the first column
  if (i === 0 && Number.isInteger(v) && v >= 1000 && v <= 9999) return String(v)
  return v.toLocaleString()
}
function toggleSort(i) {
  if (sortCol.value === i) sortDir.value *= -1
  else {
    sortCol.value = i
    sortDir.value = 1
  }
}

const sorted = computed(() => {
  const out = [...props.rows]
  if (sortCol.value >= 0) {
    const i = sortCol.value
    out.sort((a, b) => {
      const av = cell(a, i)
      const bv = cell(b, i)
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir.value
      return String(av).localeCompare(String(bv)) * sortDir.value
    })
  }
  return out
})
const visible = computed(() => sorted.value.slice(0, props.maxRows))
const hidden = computed(() => Math.max(0, props.rows.length - props.maxRows))
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-line">
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-line bg-paper-soft">
          <th
            v-for="(c, i) in columns"
            :key="c"
            class="cursor-pointer select-none px-3 py-2 font-medium text-muted first:text-left"
            :class="i === 0 ? 'text-left' : 'text-right'"
            @click="toggleSort(i)"
          >
            {{ c }}
            <span v-if="sortCol === i" aria-hidden="true">{{ sortDir === 1 ? '▲' : '▼' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, r) in visible" :key="r" class="border-b border-paper-soft last:border-0">
          <td
            v-for="(c, i) in columns"
            :key="c"
            class="px-3 py-1.5 text-ink-soft"
            :class="i === 0 ? 'text-left' : 'text-right tabular-nums'"
          >
            {{ fmt(cell(row, i), i) }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="hidden" class="px-3 py-2 text-xs text-muted-soft">
      …{{ hidden }} more row{{ hidden === 1 ? '' : 's' }} — download the CSV for the full set.
    </p>
  </div>
</template>
