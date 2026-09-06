<script setup>
// /articles/:slug — renders one article. The article body is a Vue
// component compiled from src/articles/<slug>/index.md; this wrapper adds
// the page chrome (title, date, back link), the long-form prose container
// (.article-prose in style.css), and the document head + BlogPosting
// JSON-LD, all driven by the article's frontmatter.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { findArticle, formatArticleDate } from '@/articles/index.js'
import { SITE_NAME, SITE_URL, OG_IMAGE, articleJsonLd } from '@/seo.js'

const route = useRoute()
const article = computed(() => findArticle(route.params.slug))

const canonical = computed(() =>
  article.value ? `${SITE_URL}/articles/${article.value.slug}` : `${SITE_URL}/articles`
)

useHead(() => {
  const a = article.value
  if (!a) {
    return { title: `Article not found — ${SITE_NAME}`, meta: [{ name: 'robots', content: 'noindex,follow' }] }
  }
  return {
    title: `${a.title} — ${SITE_NAME}`,
    link: [{ rel: 'canonical', href: canonical.value }],
    meta: [
      { name: 'description', content: a.description },
      { name: 'robots', content: a.draft ? 'noindex,follow' : 'index,follow' },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: a.title },
      { property: 'og:description', content: a.description },
      { property: 'og:url', content: canonical.value },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'article:published_time', content: a.date || '' },
      { property: 'article:modified_time', content: a.updated || a.date || '' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: a.title },
      { name: 'twitter:description', content: a.description }
    ],
    script: a.draft
      ? []
      : [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(
              articleJsonLd({
                title: a.title,
                description: a.description,
                path: `/articles/${a.slug}`,
                datePublished: a.date,
                dateModified: a.updated
              })
            )
          }
        ]
  }
})
</script>

<template>
  <div>
    <div class="border-b border-line px-6 pt-10 pb-8 sm:px-10 sm:pt-14">
      <div class="mx-auto max-w-3xl">
        <router-link to="/articles" class="text-xs font-medium text-muted link-underline">
          &larr; All articles
        </router-link>

        <template v-if="article">
          <div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <time v-if="article.date" :datetime="article.date">
              {{ formatArticleDate(article.date) }}
            </time>
            <span v-if="article.updated && article.updated !== article.date">
              · updated {{ formatArticleDate(article.updated) }}
            </span>
            <span v-if="article.draft" class="badge">Draft</span>
          </div>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {{ article.title }}
          </h1>
          <p v-if="article.description" class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {{ article.description }}
          </p>
          <ul v-if="article.tags.length" class="mt-4 flex flex-wrap gap-2">
            <li v-for="t in article.tags" :key="t" class="badge">{{ t }}</li>
          </ul>
        </template>

        <h1 v-else class="mt-5 text-2xl font-semibold tracking-tight text-ink">
          Article not found
        </h1>
      </div>
    </div>

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <article v-if="article" class="article-prose">
          <component :is="article.component" />
        </article>

        <p v-else class="text-sm text-muted">
          That article doesn't exist (or isn't published yet).
          <router-link to="/articles" class="link-underline">Back to all articles.</router-link>
        </p>
      </div>
    </section>
  </div>
</template>
