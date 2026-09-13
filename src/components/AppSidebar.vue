<script setup>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { sections, primaryGroups, secondaryGroups } from '@/nav.js'
import NavIcon from '@/components/NavIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})

defineEmits(['close'])

const route = useRoute()
const byName = new Map(sections.map((s) => [s.name, s]))
const renderedPrimaryGroups = computed(() =>
  primaryGroups.map((g) => ({ ...g, items: g.sections.map((n) => byName.get(n)).filter(Boolean) }))
)

// This list has grown past what a short phone screen shows at once, and
// will keep growing — rather than re-tuning padding every time that
// happens, the nav just scrolls (overflow-y-auto below) and these two
// bits make that feel intentional instead of like something got cut off:
// a bottom fade that only shows while there's actually more to see, and
// jumping the current page into view when the drawer opens so a deep
// link doesn't leave the reader hunting for "you are here".
const navRef = ref(null)
const canScrollMore = ref(false)
function updateFade() {
  const el = navRef.value
  if (!el) return
  canScrollMore.value = el.scrollHeight - el.scrollTop - el.clientHeight > 4
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    updateFade()
    navRef.value?.querySelector('[data-current="true"]')?.scrollIntoView({ block: 'center' })
  }
)

onMounted(() => {
  updateFade()
  navRef.value?.addEventListener('scroll', updateFade, { passive: true })
  window.addEventListener('resize', updateFade)
})
onBeforeUnmount(() => {
  navRef.value?.removeEventListener('scroll', updateFade)
  window.removeEventListener('resize', updateFade)
})
</script>

<template>
  <aside
    class="fixed left-0 top-0 z-40 flex h-dvh w-72 shrink-0 -translate-x-full flex-col
           bg-ink text-paper transition-transform duration-200 ease-out
           lg:sticky lg:bottom-auto lg:h-screen lg:translate-x-0 lg:self-start"
    :class="{ 'translate-x-0': open }"
    aria-label="Primary navigation"
  >
    <div class="flex items-center gap-2.5 px-6 pb-2 pt-7">
      <span class="flex h-8 w-8 items-center justify-center rounded-md bg-paper text-ink text-sm font-bold">
        W
      </span>
      <div class="leading-tight">
        <p class="text-sm font-semibold tracking-tight text-paper">Why We Die</p>
        <p class="text-xs text-paper/50">US mortality &amp; population data</p>
      </div>

      <button
        type="button"
        class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-paper/60
               transition-colors hover:bg-paper/10 hover:text-paper lg:hidden"
        aria-label="Close navigation menu"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav ref="navRef" class="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      <template v-for="group in renderedPrimaryGroups" :key="group.label ?? 'ungrouped'">
        <p
          v-if="group.label"
          class="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-paper/35"
        >
          {{ group.label }}
        </p>
        <router-link
          v-for="section in group.items"
          :key="section.path"
          :to="section.path"
          :data-current="section.path === route.path"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                 text-paper/70 transition-colors duration-150 hover:bg-paper/10 hover:text-paper"
          active-class="!bg-paper !text-ink hover:!bg-paper"
          exact-active-class="!bg-paper !text-ink hover:!bg-paper"
        >
          <NavIcon :name="section.name" class="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" />
          <span class="flex-1">{{ section.shortLabel }}</span>
        </router-link>
      </template>

      <div
        v-for="(group, gi) in secondaryGroups"
        :key="group.label"
        class="pt-4"
        :class="gi === 0 && 'mt-3 border-t border-paper/10'"
      >
        <p class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-paper/35">
          {{ group.label }}
        </p>
        <template v-for="link in group.links" :key="link.path">
          <a
            v-if="link.path.startsWith('http')"
            :href="link.path"
            target="_blank"
            rel="noopener noreferrer"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-paper/60
                   transition-colors duration-150 hover:bg-paper/10 hover:text-paper"
            data-umami-event="outbound_click"
            :data-umami-event-host="link.host"
          >
            {{ link.label }}
          </a>
          <router-link
            v-else
            :to="link.path"
            :data-current="link.path === route.path"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-paper/60
                   transition-colors duration-150 hover:bg-paper/10 hover:text-paper"
            active-class="!bg-paper !text-ink hover:!bg-paper"
          >
            {{ link.label }}
          </router-link>
        </template>
      </div>
    </nav>

    <!-- Signals there's more to scroll to, rather than the list just
         looking like it stops. Only shown while it's true (checked on
         scroll/resize/open in the script) so it never lies about content
         that isn't there. -->
    <div
      v-if="canScrollMore"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink to-transparent"
      aria-hidden="true"
    ></div>
  </aside>
</template>
