<script setup>
import { useRoute } from 'vue-router'
import { sections } from '@/nav.js'
import NavIcon from '@/components/NavIcon.vue'

defineProps({
  open: { type: Boolean, default: false }
})

defineEmits(['close'])

const route = useRoute()
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 -translate-x-full flex-col
           bg-ink text-paper transition-transform duration-200 ease-out
           lg:static lg:translate-x-0"
    :class="{ 'translate-x-0': open }"
    aria-label="Primary navigation"
  >
    <div class="flex items-center gap-2.5 px-6 pb-2 pt-7">
      <span class="flex h-8 w-8 items-center justify-center rounded-md bg-paper text-ink text-sm font-bold">
        W
      </span>
      <div class="leading-tight">
        <p class="text-sm font-semibold tracking-tight text-paper">Why We Die</p>
        <p class="text-xs text-paper/50">US mortality &amp; population data</p>
      </div>

      <button
        type="button"
        class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-paper/60
               transition-colors hover:bg-paper/10 hover:text-paper lg:hidden"
        aria-label="Close navigation menu"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
      <router-link
        v-for="section in sections"
        :key="section.path"
        :to="section.path"
        class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
               text-paper/70 transition-colors duration-150 hover:bg-paper/10 hover:text-paper"
        active-class="!bg-paper !text-ink hover:!bg-paper"
        exact-active-class="!bg-paper !text-ink hover:!bg-paper"
      >
        <NavIcon :name="section.name" class="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" />
        <span class="flex-1">{{ section.shortLabel }}</span>
        <span
          v-if="section.status === 'coming-soon'"
          class="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          :class="route.path === section.path
            ? 'border-line-strong text-muted'
            : 'border-paper/20 text-paper/50'"
        >
          Soon
        </span>
      </router-link>
    </nav>

    <div class="border-t border-paper/10 px-6 py-5">
      <p class="text-xs leading-relaxed text-paper/50">
        Data sourced from
        <a
          href="https://data.cdc.gov/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-paper/80 underline decoration-paper/30 underline-offset-2 transition-colors hover:text-paper hover:decoration-paper"
        >data.cdc.gov</a>. Not affiliated with the CDC.
      </p>
    </div>
  </aside>
</template>
