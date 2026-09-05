import { fileURLToPath, URL } from 'node:url'
import { writeFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { sections } from './src/nav.js'

const SITE_URL = 'https://whywedie.org'

// Emit sitemap.xml + robots.txt into dist/ at build time so they can't
// drift from the route list. Routes = the 6 nav sections + the two
// standalone pages.
function seoFiles() {
  return {
    name: 'whywedie-seo-files',
    apply: 'build',
    closeBundle() {
      const paths = [...sections.map((s) => s.path), '/api', '/privacy']
      const today = new Date().toISOString().slice(0, 10)
      const urls = paths
        .map(
          (p) =>
            `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc>` +
            `<lastmod>${today}</lastmod>` +
            `<changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq></url>`
        )
        .join('\n')
      writeFileSync(
        'dist/sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      )
      writeFileSync(
        'dist/robots.txt',
        `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
      )
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), seoFiles()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
  // No dev server proxy needed: the site calls data.cdc.gov's Socrata JSON
  // API directly from the browser (it supports CORS), so there's no proxy
  // backend anymore — see src/api/.
})
