<script setup>
// /notes/:slug — renders one Data Note (a Vue component compiled from
// src/notes/<slug>.md). Chrome is deliberately lighter than an Article:
// small "Note" eyebrow, tighter header, same .article-prose body. Head +
// Article JSON-LD from the note's frontmatter.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { findNote, formatNoteDate } from '@/notes/index.js'
import { SITE_NAME, SITE_URL, OG_IMAGE, noteJsonLd } from '@/seo.js'

const route = useRoute()
const note = computed(() => findNote(route.params.slug))
const canonical = computed(() =>
  note.value ? `${SITE_URL}/notes/${note.value.slug}` : `${SITE_URL}/notes`
)

useHead(() => {
  const n = note.value
  if (!n) {
    return { title: `Note not found — ${SITE_NAME}`, meta: [{ name: 'robots', content: 'noindex,follow' }] }
  }
  return {
    title: `${n.title} — ${SITE_NAME}`,
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: [
      { name: 'description', content: n.description },
      { name: 'robots', content: n.draft ? 'noindex,follow' : 'index,follow' },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: n.title },
      { property: 'og:description', content: n.description },
      { property: 'og:url', content: canonical.value },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'article:published_time', content: n.date || '' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: n.title },
      { name: 'twitter:description', content: n.description }
    ],
    script: n.draft
      ? []
      : [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(
              noteJsonLd({
                title: n.title,
                description: n.description,
                path: `/notes/${n.slug}`,
                datePublished: n.date
              })
            )
          }
        ]
  }
})
</script>

<template>
  <div>
    <div class="border-b border-line px-6 pt-10 pb-7 sm:px-10 sm:pt-14">
      <div class="mx-auto max-w-3xl">
        <router-link to="/notes" class="text-xs font-medium text-muted link-underline">
          &larr; All data notes
        </router-link>

        <template v-if="note">
          <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span class="font-semibold uppercase tracking-widest text-muted">Data note</span>
            <time v-if="note.date" :datetime="note.date">· {{ formatNoteDate(note.date) }}</time>
            <span v-if="note.draft" class="badge">Draft</span>
          </div>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {{ note.title }}
          </h1>
        </template>

        <h1 v-else class="mt-5 text-2xl font-semibold tracking-tight text-ink">Note not found</h1>
      </div>
    </div>

    <section class="px-6 py-10 sm:px-10 sm:py-14">
      <div class="mx-auto max-w-3xl">
        <article v-if="note" class="article-prose">
          <component :is="note.component" />
        </article>

        <p v-else class="text-sm text-muted">
          That note doesn't exist (or isn't published yet).
          <router-link to="/notes" class="link-underline">Back to all notes.</router-link>
        </p>

        <p v-if="note" class="mt-10 border-t border-line pt-5 text-xs text-muted">
          Data notes are quick takes. For longer pieces, see
          <router-link to="/articles" class="link-underline">Articles</router-link>.
        </p>
      </div>
    </section>
  </div>
</template>
