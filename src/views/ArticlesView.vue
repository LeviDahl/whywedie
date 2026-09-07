<script setup>
// /articles — the index. Lists every published article (drafts show only
// in `npm run dev`). Cards link to /articles/:slug.
import { useHead } from '@unhead/vue'
import PageHeader from '@/components/PageHeader.vue'
import { articles, formatArticleDate } from '@/articles/index.js'
import { STANDALONE_META } from '@/seo.js'

useHead({
  meta: [{ name: 'robots', content: 'index,follow' }]
})
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Articles"
      title="Articles"
      :description="STANDALONE_META.articles.description"
    />

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <p v-if="!articles.length" class="text-sm text-muted">
          Nothing published yet — first pieces are in the works.
        </p>

        <ul v-else class="space-y-4">
          <li v-for="a in articles" :key="a.slug">
            <router-link
              :to="`/articles/${a.slug}`"
              class="card group flex flex-col hover:border-ink"
            >
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <time v-if="a.date" :datetime="a.date">{{ formatArticleDate(a.date) }}</time>
                <span v-if="a.draft" class="badge">Draft</span>
              </div>
              <h2 class="mt-2 text-lg font-semibold text-ink group-hover:underline">
                {{ a.title }}
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ a.description }}</p>
              <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                Read
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </router-link>
          </li>
        </ul>

        <p class="mt-10 text-xs text-muted">
          Quick one-chart takes are in
          <router-link to="/notes" class="link-underline">Data Notes</router-link>.
          <a href="/feed.xml" class="link-underline">RSS feed</a>.
        </p>
      </div>
    </section>
  </div>
</template>
