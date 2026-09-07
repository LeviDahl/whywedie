// One shared wall-clock for every ticking counter on the page. Components
// call useNowClock() and get the same `now` ref, backed by a single
// 4 Hz interval that only runs while at least one component is mounted.
import { ref, onMounted, onBeforeUnmount } from 'vue'

const now = ref(Date.now())
let subscribers = 0
let timer = 0

export function useNowClock() {
  onMounted(() => {
    subscribers += 1
    if (!timer) timer = setInterval(() => { now.value = Date.now() }, 250)
  })
  onBeforeUnmount(() => {
    subscribers -= 1
    if (subscribers <= 0 && timer) {
      clearInterval(timer)
      timer = 0
    }
  })
  return now
}

const DAY_MS = 86_400_000

/** 0–1: how much of the local calendar day has elapsed at time `t`. */
export function fractionOfDay(t = Date.now()) {
  const d = new Date(t)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.min(1, Math.max(0, (t - start) / DAY_MS))
}

/** 0–1: how much of the local calendar year has elapsed at time `t`. */
export function fractionOfYear(t = Date.now()) {
  const d = new Date(t)
  const start = new Date(d.getFullYear(), 0, 1).getTime()
  const end = new Date(d.getFullYear() + 1, 0, 1).getTime()
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}
