<script setup>
// Static contact page. Two routes for getting in touch: GitHub Issues for
// bugs / data errors, email for everything else. The email address is
// assembled at runtime from parts so the literal string isn't sitting in
// the markup for scrapers to grab.
const REPO_URL = 'https://github.com/LeviDahl/whywedie'

const emailUser = 'feedback'
const emailDomain = 'whywedie.org'
const email = `${emailUser}@${emailDomain}`
const mailto = `mailto:${email}?subject=${encodeURIComponent('whywedie.org feedback')}`
</script>

<template>
  <div>
    <header class="border-b border-line px-6 py-14 sm:px-10 sm:py-20">
      <div class="mx-auto max-w-3xl">
        <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Get in touch</p>
        <h1 class="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Contact</h1>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          This is a one-person project. Corrections, ideas, and bug reports are all welcome. I
          read everything, though replies can be slow.
        </p>
      </div>
    </header>

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl space-y-8">
        <div class="card">
          <h2 class="text-base font-semibold text-ink">Found a bug or a data error?</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            Open an issue on GitHub. It helps to include the page, what you saw, what you
            expected, and your browser. Skim the open issues first in case it's already filed.
          </p>
          <a
            :href="`${REPO_URL}/issues`"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-secondary mt-4"
            data-umami-event="contact_click"
            data-umami-event-type="issue"
          >
            Open an issue on GitHub
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>

        <div class="card">
          <h2 class="text-base font-semibold text-ink">Ideas, corrections, or general feedback?</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            Email
            <a
              :href="mailto"
              class="link-underline"
              rel="nofollow"
              data-umami-event="contact_click"
              data-umami-event-type="email"
              >{{ email }}</a
            >. Feature
            requests, "you should chart X", methodology questions, or anything that doesn't fit an
            issue.
          </p>
        </div>

        <p class="border-t border-line pt-6 text-sm text-muted">
          For questions about the underlying figures themselves, the primary source is
          <a href="https://wonder.cdc.gov/" target="_blank" rel="noopener noreferrer" class="link-underline" data-umami-event="outbound_click" data-umami-event-host="wonder.cdc.gov">CDC
          WONDER</a> and <a href="https://data.cdc.gov/" target="_blank" rel="noopener noreferrer" class="link-underline" data-umami-event="outbound_click" data-umami-event-host="data.cdc.gov">data.cdc.gov</a>.
          This project is independent and not affiliated with the CDC.
        </p>
      </div>
    </section>
  </div>
</template>
