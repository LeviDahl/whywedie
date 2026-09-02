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
    description: 'About this project and how the data is sourced.'
  },
  {
    path: '/death-statistics',
    name: 'death-statistics',
    label: 'Death Statistics Over Time',
    shortLabel: 'Death Statistics',
    description:
      'Annual US death totals (1999–present) plus the most current monthly figures CDC has published.'
  },
  {
    path: '/causes-of-death',
    name: 'causes-of-death',
    label: 'Causes of Death',
    shortLabel: 'Causes of Death',
    description:
      'Leading causes of death, ranked by year (1999–present), plus how each cause has trended over time — with deaths, crude rate, and age-adjusted rate.'
  },
  {
    path: '/birth-statistics',
    name: 'birth-statistics',
    label: 'Birth Statistics',
    shortLabel: 'Birth Statistics',
    description:
      "CDC's most current provisional monthly US birth counts. Calendar-year history and the fertility rate are coming from the WONDER natality pipeline."
  },
  {
    path: '/population-change',
    name: 'population-change',
    label: 'Population Decline / Gain',
    shortLabel: 'Population Change',
    description:
      'Births vs. deaths and the shrinking natural increase between them, plus a century of US births.'
  },
  {
    path: '/by-the-numbers',
    name: 'by-the-numbers',
    label: 'By the Numbers',
    shortLabel: 'By the Numbers',
    description:
      'US births and deaths as a daily average — next to a few other things that happen in the same 24 hours.'
  }
]
