// A "tile grid map" layout — each US state (+ DC) gets one cell in a fixed
// 12-col x 8-row grid, positioned to roughly match its real location, so
// the shape still reads as "the US" without the size distortion of a true
// map (Alaska/Texas don't visually dominate just because they're large).
// Powers StateGridMap.vue on State Comparison.
//
// Layout: the widely-used NYT-style tile grid from kristw/gridmap-layout-usa
// (https://github.com/kristw/gridmap-layout-usa, MIT), col=x row=y,
// (0,0) top-left. Verified 51 entries (50 states + DC), no position
// collisions, sensible adjacency (e.g. Mississippi/Louisiana/Alabama sit
// side by side) before use.
export const STATE_GRID = [
  { name: 'Alaska', abbr: 'AK', col: 0, row: 0 },
  { name: 'Maine', abbr: 'ME', col: 11, row: 0 },
  { name: 'Vermont', abbr: 'VT', col: 9, row: 1 },
  { name: 'New Hampshire', abbr: 'NH', col: 10, row: 1 },
  { name: 'Massachusetts', abbr: 'MA', col: 11, row: 1 },
  { name: 'Washington', abbr: 'WA', col: 1, row: 2 },
  { name: 'Montana', abbr: 'MT', col: 2, row: 2 },
  { name: 'North Dakota', abbr: 'ND', col: 3, row: 2 },
  { name: 'South Dakota', abbr: 'SD', col: 4, row: 2 },
  { name: 'Minnesota', abbr: 'MN', col: 5, row: 2 },
  { name: 'Wisconsin', abbr: 'WI', col: 6, row: 2 },
  { name: 'Michigan', abbr: 'MI', col: 7, row: 2 },
  { name: 'New York', abbr: 'NY', col: 9, row: 2 },
  { name: 'Connecticut', abbr: 'CT', col: 10, row: 2 },
  { name: 'Rhode Island', abbr: 'RI', col: 11, row: 2 },
  { name: 'Oregon', abbr: 'OR', col: 1, row: 3 },
  { name: 'Idaho', abbr: 'ID', col: 2, row: 3 },
  { name: 'Wyoming', abbr: 'WY', col: 3, row: 3 },
  { name: 'Nebraska', abbr: 'NE', col: 4, row: 3 },
  { name: 'Iowa', abbr: 'IA', col: 5, row: 3 },
  { name: 'Illinois', abbr: 'IL', col: 6, row: 3 },
  { name: 'Indiana', abbr: 'IN', col: 7, row: 3 },
  { name: 'Ohio', abbr: 'OH', col: 8, row: 3 },
  { name: 'Pennsylvania', abbr: 'PA', col: 9, row: 3 },
  { name: 'New Jersey', abbr: 'NJ', col: 10, row: 3 },
  { name: 'California', abbr: 'CA', col: 0, row: 4 },
  { name: 'Nevada', abbr: 'NV', col: 1, row: 4 },
  { name: 'Utah', abbr: 'UT', col: 2, row: 4 },
  { name: 'Colorado', abbr: 'CO', col: 3, row: 4 },
  { name: 'Kansas', abbr: 'KS', col: 4, row: 4 },
  { name: 'Missouri', abbr: 'MO', col: 5, row: 4 },
  { name: 'Kentucky', abbr: 'KY', col: 6, row: 4 },
  { name: 'West Virginia', abbr: 'WV', col: 7, row: 4 },
  { name: 'District of Columbia', abbr: 'DC', col: 8, row: 4 },
  { name: 'Maryland', abbr: 'MD', col: 9, row: 4 },
  { name: 'Delaware', abbr: 'DE', col: 10, row: 4 },
  { name: 'Arizona', abbr: 'AZ', col: 2, row: 5 },
  { name: 'New Mexico', abbr: 'NM', col: 3, row: 5 },
  { name: 'Oklahoma', abbr: 'OK', col: 4, row: 5 },
  { name: 'Arkansas', abbr: 'AR', col: 5, row: 5 },
  { name: 'Tennessee', abbr: 'TN', col: 6, row: 5 },
  { name: 'Virginia', abbr: 'VA', col: 7, row: 5 },
  { name: 'North Carolina', abbr: 'NC', col: 8, row: 5 },
  { name: 'Texas', abbr: 'TX', col: 3, row: 6 },
  { name: 'Louisiana', abbr: 'LA', col: 4, row: 6 },
  { name: 'Mississippi', abbr: 'MS', col: 5, row: 6 },
  { name: 'Alabama', abbr: 'AL', col: 6, row: 6 },
  { name: 'Georgia', abbr: 'GA', col: 7, row: 6 },
  { name: 'South Carolina', abbr: 'SC', col: 8, row: 6 },
  { name: 'Hawaii', abbr: 'HI', col: 0, row: 7 },
  { name: 'Florida', abbr: 'FL', col: 7, row: 7 }
]

export const GRID_COLS = 12
export const GRID_ROWS = 8
