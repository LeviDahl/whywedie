// Single source of truth for the site's sections. The sidebar and the
// router both read from this list, so adding a new section later means
// adding one entry here (plus a view component) rather than editing
// multiple files.
//
// `label` / `shortLabel` are UI strings (page heading, sidebar). `seoTitle`
// / `seoDescription` are what the router puts in <title> / <meta
// description> — phrased for how people actually search ("how many people
// die in the US each year") rather than the friendly UI label, and to
// stand apart from the 2024 book of the same name. Fall back to
// label/description when absent.

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
      'Annual US deaths back to 1968 — with the age-adjusted rate spliced to 1900 — plus the most current monthly figures CDC has published.',
    seoTitle: 'US Deaths Per Year, 1968–2025',
    seoDescription:
      'How many people die in the US each year, 1968 to today, plus the age-adjusted death rate back to 1900 and the latest monthly provisional counts.'
  },
  {
    path: '/causes-of-death',
    name: 'causes-of-death',
    label: 'Causes of Death',
    shortLabel: 'Causes of Death',
    description:
      'Leading causes of death ranked by year (1999–present) with deaths, crude rate, and age-adjusted rate — plus trends over time, a sex/race breakdown, and broad ICD chapters back to 1968.',
    seoTitle: 'Leading Causes of Death in the US, by Year',
    seoDescription:
      'Leading causes of death in the US ranked by year (1999–2025): heart disease, cancer, COVID-19 and more, with crude/age-adjusted rates and long-run trends.'
  },
  {
    path: '/birth-statistics',
    name: 'birth-statistics',
    label: 'Birth Statistics',
    shortLabel: 'Birth Statistics',
    description:
      'Annual US births back to 1960 with the birth and fertility rates, Pew generation bands, and CDC\'s most current provisional monthly counts.',
    seoTitle: 'US Birth Rate & Fertility Rate Over Time',
    seoDescription:
      'US births per year since 1960: general fertility rate (births per 1,000 women 15–44), crude birth rate, generation cohorts, and monthly provisional counts.'
  },
  {
    path: '/population-change',
    name: 'population-change',
    label: 'Population Decline / Gain',
    shortLabel: 'Population Change',
    description:
      'Births vs. deaths and the shrinking natural increase between them, plus a century of US births.',
    seoTitle: 'US Births vs. Deaths & Natural Increase',
    seoDescription:
      'US births versus deaths and the shrinking natural increase between them, 1968–2025, plus a century of annual US births with generation cohorts.'
  },
  {
    path: '/by-the-numbers',
    name: 'by-the-numbers',
    label: 'By the Numbers',
    shortLabel: 'By the Numbers',
    description:
      'US births and deaths as a daily average — next to a few other things that happen in the same 24 hours.',
    seoTitle: 'How Many People Are Born & Die in the US Each Day',
    seoDescription:
      'Roughly how many babies are born and how many people die in the United States on a typical day, next to everyday things at the same scale.'
  },
  {
    path: '/injury-deaths',
    name: 'injury-deaths',
    label: 'Injury Deaths',
    shortLabel: 'Injury Deaths',
    description:
      'Suicide, homicide, and drug overdose deaths since 1999, plus how much of each involves a firearm.',
    seoTitle: 'US Suicide, Homicide & Drug Overdose Deaths',
    seoDescription:
      'US suicide, homicide, and drug overdose deaths since 1999, including the share that involved a firearm. CDC data on three leading causes of injury death.'
  },
  {
    path: '/state-comparison',
    name: 'state-comparison',
    label: 'State Comparison',
    shortLabel: 'By State',
    description:
      'Age-adjusted death rates by US state, for about 20 leading causes, updated quarterly.',
    seoTitle: 'US Death Rates by State',
    seoDescription:
      'Age-adjusted death rates by US state for leading causes, from suicide and drug overdose to heart disease and cancer — a quarterly snapshot.'
  }
]

// How the sidebar groups the sections above (display only — routing/SEO
// still reads the flat `sections` list). A `label: null` group renders with
// no header, just its section(s) inline. Looked at how a few comparable
// sites handle a growing topic list before landing here (OWID's full
// mega-menu is built for 500+ articles — wrong scale for ~10 sections;
// Worldometers instead collapses its biggest drill-down, "Countries", into
// ONE nav link with a picker rather than one link per country) — the move
// here is the same: group by domain instead of adding a nav row per
// feature, and any future state/country-level page gets one entry with a
// picker inside it, not dozens of rows.
export const primaryGroups = [
  { label: null, sections: ['home'] },
  {
    label: 'Mortality',
    sections: ['death-statistics', 'causes-of-death', 'injury-deaths', 'state-comparison']
  },
  { label: 'Births & Population', sections: ['birth-statistics', 'population-change'] },
  { label: null, sections: ['by-the-numbers'] }
]

// Secondary sidebar groups — rendered below the data sections as labelled,
// icon-less lists. Routes for these live directly in router/index.js (not
// generated from here), so keep the paths in sync.
export const secondaryGroups = [
  {
    label: 'Writing',
    links: [
      { path: '/articles', label: 'Articles' },
      { path: '/notes', label: 'Data Notes' }
    ]
  },
  {
    label: 'Project',
    links: [
      { path: '/api', label: 'Open API' },
      { path: '/contact', label: 'Contact' },
      { path: '/privacy', label: 'Privacy' }
    ]
  }
]
