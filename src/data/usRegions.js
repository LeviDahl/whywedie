// US Census Bureau's 4-region breakdown — the coarser alternative view on
// State Comparison (States / Regions toggle). DC follows the Census
// Bureau's own convention of grouping it into the South (South Atlantic
// division) rather than standing alone.
//
// A region's rate is an UNWEIGHTED mean of its states' age-adjusted rates
// (see stateComparison.js) — not a true population-weighted regional
// rate, since the source dataset publishes rates only, no populations to
// weight by. Rough chunks, not a precise figure; the view says so.
export const REGIONS = ['Northeast', 'Midwest', 'South', 'West']

export const STATE_REGION = {
  Connecticut: 'Northeast',
  Maine: 'Northeast',
  Massachusetts: 'Northeast',
  'New Hampshire': 'Northeast',
  'Rhode Island': 'Northeast',
  Vermont: 'Northeast',
  'New Jersey': 'Northeast',
  'New York': 'Northeast',
  Pennsylvania: 'Northeast',

  Illinois: 'Midwest',
  Indiana: 'Midwest',
  Michigan: 'Midwest',
  Ohio: 'Midwest',
  Wisconsin: 'Midwest',
  Iowa: 'Midwest',
  Kansas: 'Midwest',
  Minnesota: 'Midwest',
  Missouri: 'Midwest',
  Nebraska: 'Midwest',
  'North Dakota': 'Midwest',
  'South Dakota': 'Midwest',

  Delaware: 'South',
  Florida: 'South',
  Georgia: 'South',
  Maryland: 'South',
  'North Carolina': 'South',
  'South Carolina': 'South',
  Virginia: 'South',
  'District of Columbia': 'South',
  'West Virginia': 'South',
  Alabama: 'South',
  Kentucky: 'South',
  Mississippi: 'South',
  Tennessee: 'South',
  Arkansas: 'South',
  Louisiana: 'South',
  Oklahoma: 'South',
  Texas: 'South',

  Arizona: 'West',
  Colorado: 'West',
  Idaho: 'West',
  Montana: 'West',
  Nevada: 'West',
  'New Mexico': 'West',
  Utah: 'West',
  Wyoming: 'West',
  Alaska: 'West',
  California: 'West',
  Hawaii: 'West',
  Oregon: 'West',
  Washington: 'West'
}
