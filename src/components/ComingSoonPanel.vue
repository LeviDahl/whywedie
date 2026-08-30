<script setup>
defineProps({
  source: { type: String, default: '' },
  bullets: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10 sm:px-10">
    <div class="card border-dashed">
      <div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <span class="badge">
            <span class="h-1.5 w-1.5 rounded-full bg-muted-soft" />
            In development
          </span>
        </div>
      </div>

      <!-- Decorative placeholder chart — purely illustrative, no data. -->
      <div
        class="mt-6 flex h-48 items-end gap-1.5 rounded-lg border border-line bg-paper-soft p-6 sm:h-56"
        aria-hidden="true"
      >
        <div
          v-for="(h, i) in [38, 52, 45, 61, 58, 70, 66, 78, 74, 88, 82, 95]"
          :key="i"
          class="flex-1 rounded-t-sm bg-line-strong"
          :style="{ height: h + '%', opacity: 0.35 + (i / 24) }"
        />
      </div>

      <p class="mt-6 text-sm leading-relaxed text-muted">
        This section will feature an interactive, filterable chart built from live CDC data.
        Here's what's planned:
      </p>

      <ul class="mt-4 space-y-2.5">
        <li
          v-for="item in bullets"
          :key="item"
          class="flex items-start gap-2.5 text-sm leading-relaxed text-ink"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="mt-0.5 h-4 w-4 shrink-0 text-muted-soft">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12.5 9.5 17 19 7.5" />
          </svg>
          <span>{{ item }}</span>
        </li>
      </ul>

      <div v-if="source" class="mt-6 border-t border-line pt-5">
        <p class="text-xs text-muted">
          Planned data source: <span class="font-medium text-ink">{{ source }}</span>
        </p>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap gap-3">
      <router-link to="/" class="btn-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12l7.5-7.5M3 12h18" />
        </svg>
        Back to Home
      </router-link>
    </div>
  </div>
</template>
