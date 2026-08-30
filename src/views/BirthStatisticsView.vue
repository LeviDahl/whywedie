<script setup>
import PageHeader from '@/components/PageHeader.vue'
import ComingSoonPanel from '@/components/ComingSoonPanel.vue'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'birth-statistics')
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Natality"
      title="Birth Statistics"
      :description="section.description"
    />
    <ComingSoonPanel
      :source="section.source"
      :bullets="[
        'Total US births per year alongside the general fertility rate.',
        'Compare birth trends across recent decades to spot long-term shifts.',
        'Break births down by mother’s age group where the data allows it.',
        'Same interactive tooltip and year-range controls as the other charts.'
      ]"
    />
  </div>
</template>
