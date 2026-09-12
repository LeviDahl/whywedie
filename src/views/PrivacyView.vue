<script setup>
// Static content page. Describes the site's actual privacy practices.
// Current state: no cookies, no ads, no third-party requests. Analytics is
// Umami Cloud (index.html + src/lib/analytics.js) — cookieless, aggregate
// only, respects Do Not Track. Keep the "Analytics" section in sync with
// what src/lib/analytics.js actually tracks if that list changes.
const updated = 'September 2026'
</script>

<template>
  <div>
    <header class="border-b border-line px-6 py-14 sm:px-10 sm:py-20">
      <div class="mx-auto max-w-3xl">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">The short version</p>
        <h1 class="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Privacy</h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          This site sets no cookies and shows no ads. It doesn't identify you or follow you around
          the web. The one third-party request it makes is a cookieless analytics script, described
          below.
        </p>
      </div>
    </header>

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl space-y-8 text-base leading-relaxed text-ink">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">
            What the site doesn't do
          </h2>
          <ul class="mt-4 list-disc space-y-2 pl-5">
            <li>No cookies. No local storage, apart from one optional display setting (friendly vs.
              official cause names) that stays in your browser and is never sent anywhere.</li>
            <li>No session recording, no per-visitor heatmaps, no fingerprinting, no cross-site
              tracking, no profiles of individual visitors. That won't change; the analytics below
              stays aggregate.</li>
            <li>No ads and no ad networks.</li>
            <li>No accounts, no sign-in, no email collection.</li>
            <li>No third-party embeds, fonts, or CDNs. The one third-party script is the analytics
              tool below; everything else comes from this domain.</li>
          </ul>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">Analytics</h2>
          <p class="mt-4 max-w-2xl">
            The site uses
            <a href="https://umami.is/" target="_blank" rel="noopener noreferrer" class="link-underline">Umami</a>,
            a lightweight, cookieless analytics tool, to see which parts of the site get used: page
            views per section, plus a count of a handful of specific actions such as a chart toggle,
            a CSV or PNG download, or a click through to the CDC. Aggregate counts only. No cookies,
            no personal data, no cross-site tracking, no per-visitor profiles, and nothing that
            records what an individual did. The script honours your browser's Do Not Track setting
            and stops tracking entirely if it's on. Umami's own privacy practices are at
            <a href="https://umami.is/privacy" target="_blank" rel="noopener noreferrer" class="link-underline">umami.is/privacy</a>.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">Server logs</h2>
          <p class="mt-4 max-w-2xl">
            The web host (GoDaddy) keeps standard access logs: IP address, timestamp, page
            requested, and browser user-agent, the same as most websites. They are used for
            security and troubleshooting, not analysed for tracking, and not shared.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">The data</h2>
          <p class="mt-4 max-w-2xl">
            Every chart here draws on public, national statistics from the CDC (CDC WONDER and
            data.cdc.gov). None of it is personal or individual-level; the CDC suppresses any
            figure based on 1 to 9 deaths. The same files are available as an
            <RouterLink to="/api" class="link-underline">open API</RouterLink>.
          </p>
        </div>

        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">If you get in touch</h2>
          <p class="mt-4 max-w-2xl">
            Email to the address on the
            <RouterLink to="/contact" class="link-underline">contact page</RouterLink> forwards to a
            personal inbox and is kept only as long as it takes to reply. Nothing goes on a mailing
            list. Bug reports on GitHub are public and fall under GitHub's own privacy policy.
          </p>
        </div>

        <p class="border-t border-line pt-6 text-sm text-muted">
          An independent, non-commercial project, not affiliated with or endorsed by the CDC.
          Last updated {{ updated }}.
        </p>
      </div>
    </section>
  </div>
</template>
