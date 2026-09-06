// Self-hosted Inter (was Google Fonts). Latin subset only — the site is
// English; anything outside latin falls back to the system stack. Vite
// bundles + content-hashes the woff2. Keep these weights in sync with the
// font-weight utilities used in the app (400/500/600/700/800).
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import './style.css'

import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)
app.use(createHead())
app.mount('#app')
