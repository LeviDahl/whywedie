<script setup>
import { ref } from 'vue'
import DataTable from '@/components/DataTable.vue'
import { downloadCsv } from '@/lib/csv.js'

// A small row under a chart: an optional left-side note (e.g. data vintage),
// then a collapsible data table + CSV / Copy link. `columns` + `rows` are the
// tabular form of whatever the chart is showing. The table lives in a
// <details> so it's always in the DOM (crawlable, works without JS) but
// collapsed by default; `tableLabel` names it and `open` can start it
// expanded.
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  filename: { type: String, required: true },
  note: { type: String, default: '' },
  showLink: { type: Boolean, default: true },
  tableLabel: { type: String, default: 'Data table' },
  open: { type: Boolean, default: false }
})

const copied = ref(false)

function csv() {
  downloadCsv(props.filename, props.columns, props.rows)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
  } catch {
    return
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}
</script>

<template>
  <div>
    <div class="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-line pt-2.5">
      <span v-if="note" class="text-xs text-muted-soft">{{ note }}</span>
      <span class="flex-1"></span>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-paper-soft hover:text-ink"
        @click="csv"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />
        </svg>
        CSV
      </button>

      <button
        v-if="showLink"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-paper-soft hover:text-ink"
        @click="copyLink"
      >
        <template v-if="copied">
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Link copied
        </template>
        <template v-else>
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 15 15 9M11 6l1-1a3 3 0 0 1 4 4l-1 1M13 18l-1 1a3 3 0 0 1-4-4l1-1" />
          </svg>
          Copy link
        </template>
      </button>
    </div>

    <details class="group mt-3" :open="open">
      <summary
        class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-paper-soft hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
        {{ tableLabel }}
      </summary>
      <div class="mt-3">
        <DataTable :columns="columns" :rows="rows" />
      </div>
    </details>
  </div>
</template>
