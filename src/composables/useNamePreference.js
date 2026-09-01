import { ref, watch } from 'vue'

// Whether causes (and any future clinical labels) show as plain-language
// "friendly" names or the official NCHS names. One shared choice across the
// app, remembered in localStorage. Defaults to friendly — this is a
// general-audience site, and the official names overflow a phone screen.

const KEY = 'wwd:nameStyle'
const VALID = ['friendly', 'official']

function initial() {
  try {
    const stored = localStorage.getItem(KEY)
    return VALID.includes(stored) ? stored : 'friendly'
  } catch {
    return 'friendly'
  }
}

const nameStyle = ref(initial())

watch(nameStyle, (v) => {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* private mode / storage disabled — the in-memory ref still works */
  }
})

export function useNamePreference() {
  return { nameStyle }
}
