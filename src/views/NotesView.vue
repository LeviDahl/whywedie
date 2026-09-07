<script setup>
// /notes — the Data Notes index. A tighter list than /articles: date +
// title + one-line blurb, no "read" affordance, no cards. Drafts show only
// in `npm run dev`.
import { useHead } from '@unhead/vue'
import PageHeader from '@/components/PageHeader.vue'
import { notes, formatNoteDate } from '@/notes/index.js'
import { STANDALONE_META } from '@/seo.js'

useHead({ meta: [{ name: 'robots', content: 'index,follow' }] })
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Data Notes"
      title="Data Notes"
      :description="STANDALONE_META.notes.description"
    />

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <p v-if="!notes.length" class="text-sm text-muted">Nothing posted yet.</p>

        <ul v-else class="divide-y divide-line border-y border-line">
          <li v-for="n in notes" :key="n.slug">
            <router-link
              :to="`/notes/${n.slug}`"
              class="group block py-4 transition-colors hover:bg-paper-soft"
            >
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time v-if="n.date" :datetime="n.date" class="text-xs tabular-nums text-muted">
                  {{ formatNoteDate(n.date) }}
                </time>
                <span v-if="n.draft" class="badge">Draft</span>
                <h2 class="text-base font-semibold text-ink group-hover:underline">{{ n.title }}</h2>
              </div>
              <p class="mt-1 text-sm leading-relaxed text-muted">{{ n.description }}</p>
            </router-link>
          </li>
        </ul>

        <p class="mt-8 text-xs text-muted">
          Longer pieces are in <router-link to="/articles" class="link-underline">Articles</router-link>.
          <a href="/notes.xml" class="link-underline">RSS feed</a>.
        </p>
      </div>
    </section>
  </div>
</template>
