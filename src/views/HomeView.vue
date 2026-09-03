<script setup>
import { sections } from '@/nav.js'
import YearLookup from '@/components/YearLookup.vue'

const dataSections = sections.filter((s) => s.path !== '/')
</script>

<template>
  <div>
    <header class="border-b border-line px-6 py-14 sm:px-10 sm:py-20">
      <div class="mx-auto max-w-3xl">
        <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          An open data project
        </p>
        <h1 class="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Understanding death, birth, and population change in America
        </h1>
        <p class="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Why We Die turns official CDC data into interactive charts you can actually
          explore — how many people died and why, how many were born, and how the US
          population has shifted as a result.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <router-link to="/death-statistics" class="btn-primary">
            Explore the data
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" />
            </svg>
          </router-link>
          <a href="https://data.cdc.gov/" target="_blank" rel="noopener noreferrer" class="btn-secondary">
            View the data source
          </a>
        </div>
      </div>
    </header>

    <section class="border-b border-line px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <YearLookup />
      </div>
    </section>

    <section class="px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">What this site does</h2>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-ink">
          Every chart on this site is built from public data published on
          <a href="https://data.cdc.gov/" target="_blank" rel="noopener noreferrer" class="link-underline">data.cdc.gov</a>,
          CDC's open data platform. Rather than a single snapshot, the goal is to make it
          easy to see how these numbers move over time: which causes of death are rising or
          falling, how birth counts compare across recent years, and what that means for
          population growth overall.
        </p>
        <p class="mt-4 max-w-2xl text-base leading-relaxed text-ink">
          This is an independent, non-commercial project. It is not affiliated with or
          endorsed by the CDC, and it requires no account or sign-in — the data is free to
          explore for anyone.
        </p>
      </div>
    </section>

    <section class="border-t border-line px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">On the site</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <router-link
            v-for="section in dataSections"
            :key="section.path"
            :to="section.path"
            class="card group flex flex-col justify-between hover:border-ink"
          >
            <div>
              <h3 class="text-base font-semibold text-ink">{{ section.label }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-muted">{{ section.description }}</p>
            </div>
            <span class="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              View section
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </router-link>
        </div>
      </div>
    </section>

    <section class="border-t border-line px-6 py-12 sm:px-10 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-sm font-semibold uppercase tracking-widest text-muted">About the data</h2>
        <dl class="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted">Source</dt>
            <dd class="mt-1.5 text-sm text-ink">CDC WONDER + data.cdc.gov open data</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted">Coverage</dt>
            <dd class="mt-1.5 text-sm text-ink">National (US); 1900–present depending on the series</dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-muted">Access</dt>
            <dd class="mt-1.5 text-sm text-ink">Free, open, no account required</dd>
          </div>
        </dl>
      </div>
    </section>
  </div>
</template>
