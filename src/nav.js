// Single source of truth for the site's sections. The sidebar and the
// router both read from this list, so adding a new section later means
// adding one entry here (plus a view component) rather than editing
// multiple files.

export const sections = [
  {
    path: '/',
    name: 'home',
    label: 'Home',
    shortLabel: 'Home',
    status: 'available',
    description: 'About this project and how the data is sourced.'
  },
  {
    path: '/death-statistics',
    name: 'death-statistics',
    label: 'Death Statistics Over Time',
    shortLabel: 'Death Statistics',
    status: 'available',
    description:
      'Annual US death totals (2020–present) plus the most current monthly figures CDC has published.',
    source: 'CDC (data.cdc.gov, Socrata) — annual rollup + current monthly provisional counts'
  },
  {
    path: '/causes-of-death',
    name: 'causes-of-death',
    label: 'Causes of Death',
    shortLabel: 'Causes of Death',
    status: 'available',
    description:
      'Leading causes of death, ranked by year (1999–2020), plus how each cause has trended over time — with deaths, crude rate, and age-adjusted rate.',
    source:
      'CDC WONDER — Underlying Cause of Death, 1999–2020 (database D76), national, via the whywedie data pipeline (/data/mortality.json)'
  },
  {
    path: '/birth-statistics',
    name: 'birth-statistics',
    label: 'Birth Statistics',
    shortLabel: 'Birth Statistics',
    status: 'available',
    description:
      "CDC's most current provisional monthly US birth counts. Calendar-year history and the fertility rate are coming from the WONDER natality pipeline.",
    source:
      "CDC (data.cdc.gov, Socrata) — AH Monthly Provisional Counts of Live Births, Deaths, and Other Vital Events (dataset hmz2-vwda, indicator 'Number of Live Births')"
  },
  {
    path: '/population-change',
    name: 'population-change',
    label: 'Population Decline / Gain',
    shortLabel: 'Population Change',
    status: 'available',
    description:
      'Births vs. deaths and the shrinking natural increase between them, plus a century of US births.',
    source:
      'CDC (data.cdc.gov, Socrata) — NCHS Births and General Fertility Rates (e6fc-ccez) + Leading Causes of Death "All causes" (bi63-dtpu)'
  },
  {
    path: '/by-the-numbers',
    name: 'by-the-numbers',
    label: 'By the Numbers',
    shortLabel: 'By the Numbers',
    status: 'available',
    description:
      'US births and deaths as a daily average — next to a few other things that happen in the same 24 hours.',
    source:
      'CDC (data.cdc.gov, Socrata) for births & deaths (hmz2-vwda); assorted public estimates for the rest'
  }
]
