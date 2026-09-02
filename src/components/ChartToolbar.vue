<script setup>
import { ref } from 'vue'
import DataTable from '@/components/DataTable.vue'
import { downloadCsv } from '@/lib/csv.js'

// A small row under a chart: an optional left-side note (e.g. data vintage),
// then Table / CSV / Copy link. `columns` + `rows` are the tabular form of
// whatever the chart is showing.
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  filename: { type: String, required: true },
  note: { type: String, default: '' },
  showLink: { type: Boolean, default: true }
})

const open = ref(false)
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
        class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
        :class="open ? 'bg-ink text-paper' : 'text-muted hover:bg-paper-soft hover:text-ink'"
        :aria-expanded="open"
        @click="open = !open"
      >
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Table
      </button>

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

    <div v-if="open" class="mt-3">
      <DataTable :columns="columns" :rows="rows" />
    </div>
  </div>
</template>
