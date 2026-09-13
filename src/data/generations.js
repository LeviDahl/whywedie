// Generation cutoffs by birth year, Silent through Gen Z from Pew Research
// Center; Pew has never published a Gen Z end year (they explicitly leave
// it open), so Gen Z through Beta below are the McCrindle Research cutoffs
// instead — McCrindle coined both "Generation Alpha" and "Generation Beta"
// and is the closest thing to a standard for them. Other outlets round
// these boundaries by a year or two; there's no single authority here the
// way there is for Silent–Millennials. Nothing is named yet for a birth
// year past 2039 — leave it unlabeled (see generationForYear) rather than
// invent a name.
// Used as context bands on the births-over-time charts (Birth Statistics
// and Population Change).
//   https://www.pewresearch.org/short-reads/2019/01/17/where-millennials-end-and-generation-z-begins/
//   https://mccrindle.com.au/article/topic/generation-alpha/generation-alpha-defined/
export const GENERATIONS = [
  { from: 1928, to: 1945, label: 'Silent' },
  { from: 1946, to: 1964, label: 'Boomers' },
  { from: 1965, to: 1980, label: 'Gen X' },
  { from: 1981, to: 1996, label: 'Millennials' },
  { from: 1997, to: 2012, label: 'Gen Z' },
  { from: 2013, to: 2024, label: 'Gen Alpha' },
  { from: 2025, to: 2039, label: 'Gen Beta' }
]

// Cohorts that overlap a given year range — the ones worth offering as
// drill-down buttons for a chart covering [minYear, maxYear].
export function generationChoices(minYear, maxYear) {
  return GENERATIONS.filter((g) => g.to >= minYear && g.from <= maxYear)
}

// The named generation a birth year falls in, or null for years nobody's
// named (before 1928 — the "Greatest"/"Lost" generations have no cutoff
// here — or after 2039, the end of Gen Beta above).
export function generationForYear(year) {
  return GENERATIONS.find((g) => year >= g.from && year <= g.to)?.label ?? null
}
