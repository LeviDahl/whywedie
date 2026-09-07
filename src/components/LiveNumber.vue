<script setup>
// A single ticking figure: an annual value spread evenly across the local
// calendar day, i.e. "how many so far today". Recomputed from the shared
// 4 Hz clock. Not a live feed — a projection for scale. Values that reach
// a billion+ in a day are abbreviated ("5.847 billion") so a 10-digit
// number doesn't blow out the card; smaller ones keep full ticking digits.
import { computed } from 'vue'
import { useNowClock, fractionOfDay } from '@/composables/useClock.js'

const props = defineProps({
  perYear: { type: Number, required: true },
  prefix: { type: String, default: '' }
})

const now = useNowClock()
// A full-day figure of 100M+ is abbreviated ("400.55 million",
// "5.87 billion") so a 9–10-digit number doesn't blow out the card;
// two decimals keep it visibly ticking. Anything smaller keeps full comma
// digits (they tick fast and read fine).
const perDay = props.perYear / 365

const value = computed(() => {
  const n = perDay * fractionOfDay(now.value)
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} billion`
  if (perDay >= 1e8) return `${(n / 1e6).toFixed(2)} million`
  return Math.floor(n).toLocaleString('en-US')
})
</script>

<template>
  <span class="tabular-nums whitespace-nowrap">{{ prefix }}{{ value }}</span>
</template>
