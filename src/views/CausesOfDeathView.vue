<script setup>
import PageHeader from '@/components/PageHeader.vue'
import ComingSoonPanel from '@/components/ComingSoonPanel.vue'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'causes-of-death')
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Mortality"
      title="Causes of Death"
      :description="section.description"
    />
    <ComingSoonPanel
      :source="section.source"
      :bullets="[
        'A ranked breakdown of leading causes of death (heart disease, cancer, accidents, and more).',
        'Track how the rank and share of total deaths for each cause has changed year to year.',
        'Filter by broad category or drill into specific ICD-10 groupings.',
        'Side-by-side comparison of any two causes over the same time span.'
      ]"
    />
  </div>
</template>
