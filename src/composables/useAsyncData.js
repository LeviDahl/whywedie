import { ref } from 'vue'

/**
 * Minimal async-fetch state helper: { data, error, loading, load }.
 * Deliberately tiny — this project doesn't need a data-fetching library
 * yet, just a consistent loading/error pattern shared by each section's
 * view (Death Statistics today, Causes of Death / Birth Statistics /
 * Population Change later).
 */
export function useAsyncData(fetcher) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, load }
}
