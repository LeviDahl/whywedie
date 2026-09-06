<script setup>
// Static content page. Describes the site's actual privacy practices.
// Current state: no cookies, no ads, no third-party requests, and no
// analytics *yet* — a cookieless aggregate analytics tool is planned, and
// the "Analytics" section says so plainly. When that tool goes live, update
// that section to name it + link its policy (don't just quietly ship it).
const updated = 'September 2026'
</script>

<template>
  <div>
    <header class="border-b border-line px-6 py-14 sm:px-10 sm:py-20">
      <div class="mx-auto max-w-3xl">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">The fine print</p>
        <h1 class="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Privacy</h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Short version: no cookies, no ads, and nothing that identifies you or follows you
          around the web. The one thing on the roadmap is basic, cookieless visitor
          analytics — aggregate counts only — described below.
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
            <li>No cookies, and no local storage used for tracking. (Your browser may remember one
              display preference — friendly vs. official cause names — and that never leaves your
              device.)</li>
            <li>No session recording or replay, no per-visitor cursor/scroll heatmaps, no
              fingerprinting, no cross-site or behavioural tracking, no per-visitor profiles —
              none of that, now or planned. Any analytics that's added stays aggregate (see
              below).</li>
            <li>No advertising and no ad networks.</li>
            <li>No accounts, no sign-in, no email collection.</li>
            <li>No third-party embeds, fonts, scripts, or CDNs — everything the page needs is served
              from this domain. The only requests it makes are for its own code and, on load, the
              public data files it's built from.</li>
          </ul>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">Analytics</h2>
          <p class="mt-4 max-w-2xl">
            Right now the site runs no analytics at all. It's planned, though: a lightweight,
            cookieless tool (something like GoatCounter or Plausible) to see which parts of the
            site actually get used — page views per section, and a running tally of a handful of
            specific actions (a chart toggle, a CSV download, a section link). Counts only, <em>in
            aggregate</em>: no cookies, no personal data, no cross-site tracking, no per-visitor
            profiles, no recording of where a cursor moves or what a given person did. The tool
            will be one that honours "Do Not Track" and analytics blockers. When it goes live,
            this section will be updated to name it and link its privacy policy; it won't be
            added silently.
          </p>
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
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">If you contact us</h2>
          <p class="mt-4 max-w-2xl">
            Email sent to the address on the
            <RouterLink to="/contact" class="link-underline">contact page</RouterLink> is forwarded
            to a personal inbox and kept only as long as needed to reply. It isn't added to any
            mailing list. Bug reports opened on GitHub are public, under GitHub's own privacy
            policy.
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
