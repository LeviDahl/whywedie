import { fileURLToPath, URL } from 'node:url'
import { writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Markdown from 'unplugin-vue-markdown/vite'
import anchor from 'markdown-it-anchor'
import matter from 'gray-matter'
import { sections } from './src/nav.js'

const SITE_URL = 'https://whywedie.org'

const slugify = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')

const xmlEscape = (s) =>
  String(s ?? '').replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  )

// Read src/articles/<slug>/index.md frontmatter straight off disk. The
// runtime registry (src/articles/index.js) uses import.meta.glob, which
// isn't available here in the config — so the sitemap / feed builder
// re-reads the source with gray-matter. Drafts are excluded.
function listArticles() {
  const dir = fileURLToPath(new URL('./src/articles/', import.meta.url))
  let names = []
  try {
    names = readdirSync(dir)
  } catch {
    return []
  }
  const out = []
  for (const slug of names) {
    const md = fileURLToPath(new URL(`./src/articles/${slug}/index.md`, import.meta.url))
    if (!existsSync(md)) continue
    let fm = {}
    try {
      fm = matter(readFileSync(md, 'utf8')).data ?? {}
    } catch {
      continue
    }
    if (fm.draft) continue
    const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date ?? null
    out.push({
      slug,
      title: fm.title ?? slug,
      description: fm.description ?? '',
      date: date ? String(date).slice(0, 10) : null
    })
  }
  return out.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}

// Flat src/notes/<slug>.md — same frontmatter read, drafts excluded.
function listNotes() {
  const dir = fileURLToPath(new URL('./src/notes/', import.meta.url))
  let files = []
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
  const out = []
  for (const file of files) {
    let fm = {}
    try {
      fm = matter(readFileSync(fileURLToPath(new URL(`./src/notes/${file}`, import.meta.url)), 'utf8')).data ?? {}
    } catch {
      continue
    }
    if (fm.draft) continue
    const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date ?? null
    out.push({
      slug: file.replace(/\.md$/, ''),
      title: fm.title ?? file,
      description: fm.description ?? '',
      date: date ? String(date).slice(0, 10) : null
    })
  }
  return out.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}

function rssFeed({ title, link, description, base, items }) {
  const entries = items
    .map(
      (it) =>
        `    <item>\n` +
        `      <title>${xmlEscape(it.title)}</title>\n` +
        `      <link>${base}/${it.slug}</link>\n` +
        `      <guid isPermaLink="true">${base}/${it.slug}</guid>\n` +
        (it.date ? `      <pubDate>${new Date(it.date).toUTCString()}</pubDate>\n` : '') +
        `      <description>${xmlEscape(it.description)}</description>\n` +
        `    </item>`
    )
    .join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n` +
    `    <title>${xmlEscape(title)}</title>\n    <link>${link}</link>\n` +
    `    <description>${xmlEscape(description)}</description>\n    <language>en-us</language>\n` +
    (entries ? `${entries}\n` : '') +
    `  </channel>\n</rss>\n`
  )
}

// Emit sitemap.xml + robots.txt + feed.xml + notes.xml into dist/ at build
// time so they can't drift: the 6 nav sections + standalone pages + one URL
// per published article and per published data note.
function seoFiles() {
  return {
    name: 'whywedie-seo-files',
    apply: 'build',
    closeBundle() {
      const today = new Date().toISOString().slice(0, 10)
      const articles = listArticles()
      const notes = listNotes()

      const rows = [
        ...[
          ...sections.map((s) => s.path),
          '/articles',
          '/notes',
          '/api',
          '/contact',
          '/privacy'
        ].map((p) => ({
          loc: p === '/' ? '/' : p,
          lastmod: today,
          changefreq: p === '/' ? 'weekly' : 'monthly'
        })),
        ...articles.map((a) => ({ loc: `/articles/${a.slug}`, lastmod: a.date ?? today, changefreq: 'yearly' })),
        ...notes.map((n) => ({ loc: `/notes/${n.slug}`, lastmod: n.date ?? today, changefreq: 'yearly' }))
      ]

      const urls = rows
        .map(
          (r) =>
            `  <url><loc>${SITE_URL}${r.loc}</loc>` +
            `<lastmod>${r.lastmod}</lastmod>` +
            `<changefreq>${r.changefreq}</changefreq></url>`
        )
        .join('\n')
      writeFileSync(
        'dist/sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      )
      writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

      writeFileSync(
        'dist/feed.xml',
        rssFeed({
          title: 'Why We Die — Articles',
          link: `${SITE_URL}/articles`,
          description: 'Short essays on the oddities in US mortality, birth, and population data.',
          base: `${SITE_URL}/articles`,
          items: articles
        })
      )
      writeFileSync(
        'dist/notes.xml',
        rssFeed({
          title: 'Why We Die — Data Notes',
          link: `${SITE_URL}/notes`,
          description: 'Quick takes on US mortality, birth, and population data — one chart, a paragraph or two.',
          base: `${SITE_URL}/notes`,
          items: notes
        })
      )
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({ include: [/\.vue$/, /\.md$/] }),
    Markdown({
      wrapperClasses: '',
      headEnabled: false,
      markdownItOptions: { html: true, linkify: true, typographer: true },
      markdownItSetup(md) {
        md.use(anchor, { level: [2, 3], slugify, tabIndex: false })
      }
    }),
    tailwindcss(),
    seoFiles()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
  // No dev server proxy needed: the site calls data.cdc.gov's Socrata JSON
  // API directly from the browser (it supports CORS), so there's no proxy
  // backend anymore — see src/api/.
})
