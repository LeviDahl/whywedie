<script setup>
// Figure wrapper for articles: puts a chart, image, or table in a framed
// <figure> with an optional caption and a source line. Use it inside an
// article's index.md (import it in the file's <script setup> block).
//
//   <ArticleFigure caption="US heart-disease deaths, 2006–2025" source="CDC WONDER">
//     <HeartDiseaseDeaths />
//   </ArticleFigure>
defineProps({
  caption: { type: String, default: '' },
  source: { type: String, default: '' }
})
</script>

<template>
  <figure class="my-8 not-prose">
    <div class="rounded-xl border border-line bg-paper p-4 sm:p-5">
      <slot />
    </div>
    <figcaption
      v-if="caption || source"
      class="mt-2 text-xs leading-relaxed text-muted"
    >
      <span v-if="caption">{{ caption }}</span>
      <span v-if="caption && source"> · </span>
      <span v-if="source">Source: {{ source }}</span>
    </figcaption>
  </figure>
</template>
