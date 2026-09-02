// Pew Research Center generation cutoffs, by birth year. Pew defines
// Boomer → Gen Z; "Gen Z" has no published end year, so it runs open-ended.
// Used as context bands on the births-over-time charts (Birth Statistics
// and Population Change).
//   https://www.pewresearch.org/short-reads/2019/01/17/where-millennials-end-and-generation-z-begins/
export const PEW_GENERATIONS = [
  { from: 1928, to: 1945, label: 'Silent' },
  { from: 1946, to: 1964, label: 'Boomers' },
  { from: 1965, to: 1980, label: 'Gen X' },
  { from: 1981, to: 1996, label: 'Millennials' },
  { from: 1997, to: 2100, label: 'Gen Z' }
]

// Cohorts that overlap a given year range — the ones worth offering as
// drill-down buttons for a chart covering [minYear, maxYear].
export function generationChoices(minYear, maxYear) {
  return PEW_GENERATIONS.filter((g) => g.to >= minYear && g.from <= maxYear)
}
