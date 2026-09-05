<script setup>
// Static content page. Describes the site's actual privacy practices as of
// now — no cookies, no analytics, no third-party scripts. Update this if an
// analytics tool or any embedded third party is ever added.
const updated = 'September 2026'
</script>

<template>
  <div>
    <header class="border-b border-line px-6 py-14 sm:px-10 sm:py-20">
      <div class="mx-auto max-w-3xl">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">The fine print</p>
        <h1 class="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Privacy</h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Short version: this site doesn't track you. No cookies, no analytics, no ads, no
          third-party scripts.
        </p>
      </div>
    </header>

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl space-y-8 text-base leading-relaxed text-ink">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">
            What we don't collect
          </h2>
          <ul class="mt-4 list-disc space-y-2 pl-5">
            <li>No cookies or other local storage for tracking. (Your browser may remember one
              preference — friendly vs. official cause names — and that never leaves your device.)</li>
            <li>No analytics, no visitor counter, no session recording, no heatmaps.</li>
            <li>No advertising and no ad networks.</li>
            <li>No accounts, no sign-in, no email collection.</li>
            <li>No third-party embeds. The only external requests the page makes are for the
              Inter font (Google Fonts) and, on load, the public data files this site is built
              from.</li>
          </ul>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">Server logs</h2>
          <p class="mt-4 max-w-2xl">
            The web host (GoDaddy) keeps standard access logs — IP address, timestamp, page
            requested, browser user-agent — the same as essentially every website. These are used
            only for security and basic troubleshooting and are not analysed for tracking or shared.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">The data</h2>
          <p class="mt-4 max-w-2xl">
            Everything charted here is public, aggregate, national statistics from the U.S. Centers
            for Disease Control and Prevention (CDC WONDER and data.cdc.gov). It contains no
            personal or individual-level records — CDC suppresses any figure based on 1–9 deaths.
            The same files are available as an <RouterLink to="/api" class="link-underline">open
            API</RouterLink>.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">
            If this ever changes
          </h2>
          <p class="mt-4 max-w-2xl">
            A privacy-respecting, cookieless analytics tool may be added later to understand which
            sections are useful — aggregate counts only, still no cookies and no personal data. If
            that happens, this page will say so, name the tool, and link its own privacy policy
            before it goes live.
          </p>
        </div>

        <p class="border-t border-line pt-6 text-sm text-muted">
          This is an independent, non-commercial project, not affiliated with or endorsed by the
          CDC. Last updated {{ updated }}.
        </p>
      </div>
    </section>
  </div>
</template>
