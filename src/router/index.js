import { createRouter, createWebHistory } from 'vue-router'
import { sections } from '@/nav.js'
import { STANDALONE_META } from '@/seo.js'

const viewComponents = {
  home: () => import('@/views/HomeView.vue'),
  'death-statistics': () => import('@/views/DeathStatisticsView.vue'),
  'causes-of-death': () => import('@/views/CausesOfDeathView.vue'),
  'birth-statistics': () => import('@/views/BirthStatisticsView.vue'),
  'population-change': () => import('@/views/PopulationChangeView.vue'),
  'by-the-numbers': () => import('@/views/ByTheNumbersView.vue')
}

const routes = sections.map((section) => ({
  path: section.path,
  name: section.name,
  component: viewComponents[section.name],
  meta: { title: section.label, description: section.description }
}))

// Standalone pages — not sidebar sections, linked from the footer.
routes.push(
  {
    path: '/api',
    name: 'api',
    component: () => import('@/views/ApiView.vue'),
    meta: { ...STANDALONE_META.api }
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: { ...STANDALONE_META.privacy }
  }
)

// Fallback: unknown paths go home rather than showing a dead end.
routes.push({ path: '/:pathMatch(.*)*', redirect: '/' })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Views sync their controls into the query string (router.replace) — a
    // same-path query change must NOT yank the page back to the top.
    if (to.path === from.path) return false
    return savedPosition ?? { top: 0 }
  }
})

// Title + the rest of the document head are set from route meta in
// App.vue via @unhead/vue (useHead) — see src/seo.js.

export default router
