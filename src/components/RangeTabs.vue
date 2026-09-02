<script setup>
// Small segmented control for picking a time window on a chart.
// options: [{ key, label }]. v-model holds the selected key.
defineProps({
  options: { type: Array, required: true },
  ariaLabel: { type: String, default: 'Time range' }
})
const model = defineModel({ type: String, required: true })
</script>

<template>
  <div
    class="inline-flex overflow-hidden rounded-lg border border-line-strong"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      class="px-2.5 py-1 text-xs font-medium transition-colors duration-150 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line-strong"
      :class="model === opt.key ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-soft'"
      :aria-pressed="model === opt.key"
      @click="model = opt.key"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
