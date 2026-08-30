import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
  // No dev server proxy needed: the site calls data.cdc.gov's Socrata JSON
  // API directly from the browser (it supports CORS), so there's no proxy
  // backend anymore — see src/api/.
})
