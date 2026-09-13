import { createRouter, createWebHistory } from 'vue-router'
import { sections } from '@/nav.js'
import { STANDALONE_META } from '@/seo.js'

const viewComponents = {
  home: () => import('@/views/HomeView.vue'),
  'death-statistics': () => import('@/views/DeathStatisticsView.vue'),
  'causes-of-death': () => import('@/views/CausesOfDeathView.vue'),
  'birth-statistics': () => import('@/views/BirthStatisticsView.vue'),
  'population-change': () => import('@/views/PopulationChangeView.vue'),
  'by-the-numbers': () => import('@/views/ByTheNumbersView.vue'),
  'injury-deaths': () => import('@/views/InjuryDeathsView.vue'),
  'state-comparison': () => import('@/views/StateComparisonView.vue'),
  international: () => import('@/views/InternationalView.vue')
}

const routes = sections.map((section) => ({
  path: section.path,
  name: section.name,
  component: viewComponents[section.name],
  meta: {
    // SEO copy when present (see nav.js), else the friendly UI strings.
    title: section.seoTitle ?? section.label,
    description: section.seoDescription ?? section.description
  }
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
  },
  {
    path: '/articles',
    name: 'articles',
    component: () => import('@/views/ArticlesView.vue'),
    meta: { ...STANDALONE_META.articles }
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: { ...STANDALONE_META.contact }
  },
  {
    // Article head/meta are set inside the view from the article's
    // frontmatter (title unknown until the slug resolves).
    path: '/articles/:slug',
    name: 'article',
    component: () => import('@/views/ArticleView.vue')
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('@/views/NotesView.vue'),
    meta: { ...STANDALONE_META.notes }
  },
  {
    path: '/notes/:slug',
    name: 'note',
    component: () => import('@/views/NoteView.vue')
  },
  {
    // Bare single-chart pages for <iframe> embeds on other sites. App.vue
    // renders these without the sidebar / footer / site head.
    path: '/embed/:slug',
    name: 'embed',
    component: () => import('@/views/EmbedView.vue'),
    meta: { bare: true }
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
    // Deep link to an article heading (#some-heading).
    if (to.hash) return { el: to.hash, top: 80 }
    return savedPosition ?? { top: 0 }
  }
})

// Title + the rest of the document head are set from route meta in
// App.vue via @unhead/vue (useHead) — see src/seo.js.

export default router
