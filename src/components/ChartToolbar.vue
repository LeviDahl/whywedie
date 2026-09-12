<script setup>
import { ref, computed } from 'vue'
import DataTable from '@/components/DataTable.vue'
import { downloadCsv } from '@/lib/csv.js'
import { trackEvent } from '@/lib/analytics.js'
import { SITE_URL } from '@/seo.js'

// A small row under a chart: an optional left-side note (e.g. data vintage),
// then a collapsible data table + CSV / Copy link / Embed. `columns` +
// `rows` are the tabular form of whatever the chart is showing. The table
// lives in a <details> so it's always in the DOM (crawlable, works without
// JS) but collapsed by default; `tableLabel` names it and `open` can start
// it expanded. Pass `embedSlug` (+ optional `embedParams`) to show an
// "Embed" panel with an <iframe> snippet for /embed/<slug>.
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  filename: { type: String, required: true },
  note: { type: String, default: '' },
  showLink: { type: Boolean, default: true },
  tableLabel: { type: String, default: 'Data table' },
  open: { type: Boolean, default: false },
  embedSlug: { type: String, default: '' },
  embedParams: { type: Object, default: () => ({}) }
})

const copied = ref(false)
const embedCopied = ref(false)

function csv() {
  downloadCsv(props.filename, props.columns, props.rows)
  trackEvent('csv_download', { chart: props.filename })
}

async function copyText(text, flag) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return
  }
  flag.value = true
  setTimeout(() => (flag.value = false), 1800)
}
const copyLink = () => {
  copyText(window.location.href, copied)
  trackEvent('link_copy', { chart: props.filename })
}
const copyEmbed = () => {
  copyText(embedCode.value, embedCopied)
  trackEvent('embed_copy', { chart: props.embedSlug })
}

const embedSrc = computed(() => {
  const qs = Object.entries(props.embedParams)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return `${SITE_URL}/embed/${props.embedSlug}${qs ? `?${qs}` : ''}`
})
const embedCode = computed(
  () =>
    `<iframe src="${embedSrc.value}" width="100%" height="480" ` +
    `style="border:0;max-width:760px" loading="lazy" ` +
    `title="Chart — whywedie.org"></iframe>`
)
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

      <details v-if="embedSlug" class="group/embed relative">
        <summary
          class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-paper-soft hover:text-ink [&::-webkit-details-marker]:hidden"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="m8 18-6-6 6-6M16 6l6 6-6 6" />
          </svg>
          Embed
        </summary>
        <div class="mt-2 rounded-lg border border-line bg-paper-soft p-3">
          <p class="text-xs text-muted">Paste this where you want the interactive chart:</p>
          <pre class="mt-2 overflow-x-auto rounded bg-paper p-2 text-[11px] leading-relaxed text-ink"><code>{{ embedCode }}</code></pre>
          <div class="mt-2 flex items-center gap-3">
            <button
              type="button"
              class="btn-secondary px-2.5 py-1 text-xs"
              @click="copyEmbed"
            >
              {{ embedCopied ? 'Copied' : 'Copy code' }}
            </button>
            <a
              :href="embedSrc"
              target="_blank"
              rel="noopener"
              class="text-xs text-muted link-underline"
              data-umami-event="embed_preview"
              :data-umami-event-chart="embedSlug"
            >
              Preview
            </a>
          </div>
        </div>
      </details>
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
