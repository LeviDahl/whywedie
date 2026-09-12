// Thin wrapper around Umami's window.umami.track(). Umami's script (added
// in index.html once the site is registered) defines window.umami; until
// then, or if a blocker strips the script, this just no-ops. Analytics is
// a nice-to-have signal, never load-bearing, so failures here are silent.
export function trackEvent(name, data) {
  try {
    window.umami?.track(name, data)
  } catch {
    // ignore
  }
}
