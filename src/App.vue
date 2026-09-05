<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { SITE_NAME, SITE_URL, OG_IMAGE, DEFAULT_DESCRIPTION, siteJsonLd } from '@/seo.js'

const sidebarOpen = ref(false)
const route = useRoute()

// One place sets the document head; views may add their own (e.g. a
// Dataset JSON-LD block) on top. Title / description come from route meta
// (src/router/index.js + src/nav.js + src/seo.js).
const isHome = computed(() => route.path === '/')
const pageTitle = computed(() =>
  isHome.value || !route.meta?.title
    ? `${SITE_NAME} — US Mortality & Population Statistics`
    : `${route.meta.title} — ${SITE_NAME}`
)
const pageDescription = computed(() =>
  isHome.value ? DEFAULT_DESCRIPTION : route.meta?.description || DEFAULT_DESCRIPTION
)
const canonical = computed(() => `${SITE_URL}${route.path === '/' ? '' : route.path}`)

useHead(() => ({
  title: pageTitle.value,
  link: [{ rel: 'canonical', href: canonical.value }],
  meta: [
    { name: 'description', content: pageDescription.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDescription.value },
    { property: 'og:url', content: canonical.value },
    { property: 'og:image', content: OG_IMAGE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle.value },
    { name: 'twitter:description', content: pageDescription.value },
    { name: 'twitter:image', content: OG_IMAGE }
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(siteJsonLd()) }
  ]
}))

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
      <!-- No page-change <Transition> here: wrapping the lazy-loaded route
           components in one (without <Suspense>) left them stuck in the
           enter-from state — opacity:0 — on a fresh load / direct link /
           refresh, i.e. a blank page. Not worth a 200ms fade. -->
      <router-view v-slot="{ Component, route: currentRoute }">
        <component :is="Component" :key="currentRoute.path" />
      </router-view>

      <footer class="border-t border-line px-6 py-8 text-xs text-muted sm:px-10">
        <div class="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2">
          <span>Why We Die — an independent open-data project, not affiliated with the CDC.</span>
          <span class="flex flex-wrap gap-x-4 gap-y-2">
            <router-link to="/api" class="link-underline">API</router-link>
            <router-link to="/privacy" class="link-underline">Privacy</router-link>
            <a
              href="https://data.cdc.gov/"
              target="_blank"
              rel="noopener noreferrer"
              class="link-underline"
              >Data source</a
            >
          </span>
        </div>
      </footer>
    </main>
  </div>
</template>
