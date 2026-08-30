<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'

const sidebarOpen = ref(false)
const route = useRoute()

// Auto-close the mobile drawer whenever navigation happens.
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<template>
  <div class="min-h-screen bg-paper text-ink lg:flex">
    <!-- Mobile top bar -->
    <header
      class="sticky top-0 z-30 flex items-center justify-between border-b border-line
             bg-paper/95 px-4 py-3 backdrop-blur-sm lg:hidden"
    >
      <router-link to="/" class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-paper text-xs font-bold">
          W
        </span>
        <span class="text-sm font-semibold tracking-tight">Why We Die</span>
      </router-link>

      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong
               text-ink transition-colors hover:bg-paper-soft"
        :aria-expanded="sidebarOpen"
        aria-label="Toggle navigation menu"
        @click="sidebarOpen = !sidebarOpen"
      >
        <svg v-if="!sidebarOpen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-5 w-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-5 w-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <main class="min-w-0 flex-1">
      <router-view v-slot="{ Component, route: currentRoute }">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
        >
          <component :is="Component" :key="currentRoute.path" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>
