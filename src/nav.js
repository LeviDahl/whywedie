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
    status: 'coming-soon',
    description:
      'Leading causes of death by ICD-10 category, and how their ranking has shifted over time.',
    source: 'CDC (data.cdc.gov, Socrata) — exact dataset not chosen yet'
  },
  {
    path: '/birth-statistics',
    name: 'birth-statistics',
    label: 'Birth Statistics',
    shortLabel: 'Birth Statistics',
    status: 'coming-soon',
    description: 'US birth counts tracked over time.',
    source:
      "CDC (data.cdc.gov, Socrata) — AH Monthly Provisional Counts of Live Births, Deaths, and Other Vital Events (dataset hmz2-vwda, indicator 'Number of Live Births'); fetch already implemented in src/api/currentVitalEvents.js"
  },
  {
    path: '/population-change',
    name: 'population-change',
    label: 'Population Decline / Gain',
    shortLabel: 'Population Change',
    status: 'coming-soon',
    description:
      'Net population change derived from births vs. deaths, year over year.',
    source: 'CDC (data.cdc.gov, Socrata) — combines the birth and death pipelines above'
  }
]
