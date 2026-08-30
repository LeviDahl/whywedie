<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>

<template>
  <header class="border-b border-line px-6 py-10 sm:px-10 sm:py-14">
    <div class="mx-auto max-w-4xl">
      <p v-if="eyebrow" class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        {{ eyebrow }}
      </p>
      <h1 class="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        {{ description }}
      </p>
    </div>
  </header>
</template>
