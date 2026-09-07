// Data Notes registry — a SEPARATE content type from Articles. A note is
// short: one chart + a paragraph or two, published often. Articles are
// long-form essays. Keep them apart so readers aren't confused.
//
//   src/notes/<slug>.md   — flat file, YAML frontmatter + Markdown + an
//                           optional <script setup> that imports a chart
//                           (@/components/TimeSeriesChart.vue or an
//                           @/components/ArticleFigure.vue wrapper).
//
// Frontmatter: title, date ("YYYY-MM-DD", quoted), description (required).
// Optional: draft: true (hidden from the index + sitemap + notes.xml in a
// prod build; still reachable by direct URL, noindex; shown in `npm run dev`).
// No tags, no `updated` — notes are meant to be quick.
//
// vite.config.js re-reads this same frontmatter off disk for the sitemap
// and notes.xml feed (it can't use import.meta.glob), so keep them in sync.

const modules = import.meta.glob('./*.md', { eager: true })

function toEntry([path, mod]) {
  const slug = path.replace(/^\.\//, '').replace(/\.md$/, '')
  const fm = mod.frontmatter ?? mod
  return {
    slug,
    component: mod.default,
    title: fm.title ?? slug,
    description: fm.description ?? '',
    date: fm.date ? String(fm.date).slice(0, 10) : null,
    draft: Boolean(fm.draft)
  }
}

const all = Object.entries(modules)
  .map(toEntry)
  .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))

/** Every note, drafts included — for direct-URL access + dev. */
export const allNotes = all

/** Listed notes: drafts shown in dev, hidden from a production build. */
export const notes = import.meta.env.DEV ? all : all.filter((n) => !n.draft)

/** Look up one note by slug (searches drafts too). */
export function findNote(slug) {
  return all.find((n) => n.slug === slug) ?? null
}

/** "2026-09-08" -> "September 8, 2026". Returns '' for a missing date. */
export function formatNoteDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
