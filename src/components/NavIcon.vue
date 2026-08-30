<script setup>
defineProps({
  name: { type: String, required: true },
  class: { type: String, default: 'h-5 w-5' }
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="$props.class"
    aria-hidden="true"
  >
    <path v-if="name === 'home'" d="M3 11.5 12 4l9 7.5M5.5 10v9.5a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1V15a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V10" />

    <path v-else-if="name === 'death-statistics'" d="M3.5 19.5h17M6 19.5V13m4.5 6.5V8.5M15 19.5v-9m4.5 9V5" />

    <path v-else-if="name === 'causes-of-death'" d="M8.5 4.5h7a1 1 0 0 1 1 1V5h1a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1v-.5a1 1 0 0 1 1-1Z M9 11.5h6M9 15h6M9 8h3" />

    <path v-else-if="name === 'birth-statistics'" d="M12 21c4.5-3.2 7-6.4 7-9.8A5.2 5.2 0 0 0 13.8 6a4.8 4.8 0 0 0-1.8.36A4.8 4.8 0 0 0 10.2 6 5.2 5.2 0 0 0 5 11.2c0 3.4 2.5 6.6 7 9.8Z" />

    <path v-else-if="name === 'population-change'" d="M8.5 10.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM3.5 19v-1.5a4 4 0 0 1 4-4h2a4 4 0 0 1 3.6 2.25 M16 10.25a2.75 2.75 0 1 0 0-5.5 M14.7 8.5A4 4 0 0 1 20.5 12v.25 M13 19v-1.5a3.98 3.98 0 0 0-.65-2.19 M17 19.5l2.5-2.5m0 0-2.5-2.5m2.5 2.5h-6" />

    <path v-else d="M12 6v12m-6-6h12" />
  </svg>
</template>
