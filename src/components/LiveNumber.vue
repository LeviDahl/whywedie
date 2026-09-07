<script setup>
// A single ticking integer: an annual figure spread evenly across the
// local calendar day, i.e. "how many so far today". Recomputed from the
// shared 4 Hz clock. Not a live feed — a projection for scale.
import { computed } from 'vue'
import { useNowClock, fractionOfDay } from '@/composables/useClock.js'

const props = defineProps({
  perYear: { type: Number, required: true },
  prefix: { type: String, default: '' }
})

const now = useNowClock()
const value = computed(() =>
  Math.floor((props.perYear / 365) * fractionOfDay(now.value)).toLocaleString('en-US')
)
</script>

<template>
  <span class="tabular-nums">{{ prefix }}{{ value }}</span>
</template>
