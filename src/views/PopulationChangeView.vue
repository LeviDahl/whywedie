<script setup>
import PageHeader from '@/components/PageHeader.vue'
import ComingSoonPanel from '@/components/ComingSoonPanel.vue'
import { sections } from '@/nav.js'

const section = sections.find((s) => s.name === 'population-change')
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Population"
      title="Population Decline / Gain"
      :description="section.description"
    />
    <ComingSoonPanel
      :source="section.source"
      :bullets="[
        'Net natural population change (births minus deaths) charted year over year.',
        'A clear view of whether that gap is widening, narrowing, or has flipped negative.',
        'Births and deaths overlaid on the same timeline for direct comparison.',
        'Context notes on how natural change relates to overall population growth, which also includes migration.'
      ]"
    />
  </div>
</template>
