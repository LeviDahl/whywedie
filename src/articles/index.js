// Article registry. Each article is a folder under src/articles/:
//
//   src/articles/<slug>/
//     index.md            frontmatter + prose (compiled to a Vue component
//                         by unplugin-vue-markdown — see vite.config.js)
//     *.vue               optional bespoke figure components the .md imports
//                         via its own <script setup> block
//
// Frontmatter (YAML) fields this reads:
//   title        required — headline
//   date         required — "YYYY-MM-DD" (quote it), used for ordering + <pubDate>
//   description  required — one sentence; card blurb + meta description + OG
//   updated      optional — "YYYY-MM-DD" if revised after publish
//   tags         optional — string[]
//   draft        optional — true hides it from the index + sitemap in a
//                production build; still reachable by direct URL in `npm run dev`
//
// The sitemap / RSS builder in vite.config.js re-reads the same frontmatter
// off disk (it can't use import.meta.glob), so keep the two in sync.

const modules = import.meta.glob('./*/index.md', { eager: true })

function toEntry([path, mod]) {
  const slug = path.split('/')[1]
  // unplugin-vue-markdown exports each frontmatter key as a named export
  // (title, date, …); older/other setups expose a `frontmatter` object.
  const fm = mod.frontmatter ?? mod
  const date = fm.date ? String(fm.date).slice(0, 10) : null
  return {
    slug,
    component: mod.default,
    title: fm.title ?? slug,
    description: fm.description ?? '',
    date,
    updated: fm.updated ? String(fm.updated).slice(0, 10) : date,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    draft: Boolean(fm.draft)
  }
}

const all = Object.entries(modules)
  .map(toEntry)
  .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))

/** Every article, drafts included — for direct-URL access + dev. */
export const allArticles = all

/** Listed articles: drafts shown in dev, hidden from a production build. */
export const articles = import.meta.env.DEV ? all : all.filter((a) => !a.draft)

/** Look up one article by slug (searches drafts too). */
export function findArticle(slug) {
  return all.find((a) => a.slug === slug) ?? null
}

/** "2026-09-15" -> "September 15, 2026". Returns '' for a missing date. */
export function formatArticleDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
