import { createRouter, createWebHistory } from 'vue-router'
import { sections } from '@/nav.js'

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
  meta: {
    title: section.label,
    status: section.status
  }
}))

// Fallback: unknown paths go home rather than showing a dead end.
routes.push({ path: '/:pathMatch(.*)*', redirect: '/' })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.afterEach((to) => {
  const base = 'Why We Die'
  document.title = to.meta?.title ? `${to.meta.title} — ${base}` : base
})

export default router
