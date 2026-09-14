// A "tile grid map" layout — each US state (+ DC) gets one cell in a fixed
// 12-col x 8-row grid, positioned to roughly match its real location, so
// the shape still reads as "the US" without the size distortion of a true
// map (Alaska/Texas don't visually dominate just because they're large).
// Powers TileGridMap.vue on State Comparison.
//
// Layout: NPR's tile grid from kristw/gridmap-layout-usa
// (https://github.com/kristw/gridmap-layout-usa, MIT). Switched from that
// repo's default (NYT) layout 2026-09-14 — the NYT grid put DC directly
// under Ohio and Virginia directly above Georgia, both of which read as
// wrong neighbors once the tiles were actually filled in and touching
// (reported directly: "DC is next to Ohio"). NPR's grid puts DC under
// Maryland (a real border) and separates VA/GA with South Carolina
// between them — checked by hand against every state's real neighbors
// before switching. col=x row=y, (0,0) top-left. 51 entries (50 states +
// DC), no position collisions, verified against src/api/stateComparison.js's
// state list (exact name match, 51/51) before use.
export const STATE_GRID = [
  { name: 'Alaska', abbr: 'AK', col: 0, row: 0 },
  { name: 'Maine', abbr: 'ME', col: 11, row: 0 },
  { name: 'Vermont', abbr: 'VT', col: 10, row: 1 },
  { name: 'New Hampshire', abbr: 'NH', col: 11, row: 1 },
  { name: 'Washington', abbr: 'WA', col: 1, row: 2 },
  { name: 'Idaho', abbr: 'ID', col: 2, row: 2 },
  { name: 'Montana', abbr: 'MT', col: 3, row: 2 },
  { name: 'North Dakota', abbr: 'ND', col: 4, row: 2 },
  { name: 'Minnesota', abbr: 'MN', col: 5, row: 2 },
  { name: 'Illinois', abbr: 'IL', col: 6, row: 2 },
  { name: 'Wisconsin', abbr: 'WI', col: 7, row: 2 },
  { name: 'Michigan', abbr: 'MI', col: 8, row: 2 },
  { name: 'New York', abbr: 'NY', col: 9, row: 2 },
  { name: 'Rhode Island', abbr: 'RI', col: 10, row: 2 },
  { name: 'Massachusetts', abbr: 'MA', col: 11, row: 2 },
  { name: 'Oregon', abbr: 'OR', col: 1, row: 3 },
  { name: 'Nevada', abbr: 'NV', col: 2, row: 3 },
  { name: 'Wyoming', abbr: 'WY', col: 3, row: 3 },
  { name: 'South Dakota', abbr: 'SD', col: 4, row: 3 },
  { name: 'Iowa', abbr: 'IA', col: 5, row: 3 },
  { name: 'Indiana', abbr: 'IN', col: 6, row: 3 },
  { name: 'Ohio', abbr: 'OH', col: 7, row: 3 },
  { name: 'Pennsylvania', abbr: 'PA', col: 8, row: 3 },
  { name: 'New Jersey', abbr: 'NJ', col: 9, row: 3 },
  { name: 'Connecticut', abbr: 'CT', col: 10, row: 3 },
  { name: 'California', abbr: 'CA', col: 1, row: 4 },
  { name: 'Utah', abbr: 'UT', col: 2, row: 4 },
  { name: 'Colorado', abbr: 'CO', col: 3, row: 4 },
  { name: 'Nebraska', abbr: 'NE', col: 4, row: 4 },
  { name: 'Missouri', abbr: 'MO', col: 5, row: 4 },
  { name: 'Kentucky', abbr: 'KY', col: 6, row: 4 },
  { name: 'West Virginia', abbr: 'WV', col: 7, row: 4 },
  { name: 'Virginia', abbr: 'VA', col: 8, row: 4 },
  { name: 'Maryland', abbr: 'MD', col: 9, row: 4 },
  { name: 'Delaware', abbr: 'DE', col: 10, row: 4 },
  { name: 'Arizona', abbr: 'AZ', col: 2, row: 5 },
  { name: 'New Mexico', abbr: 'NM', col: 3, row: 5 },
  { name: 'Kansas', abbr: 'KS', col: 4, row: 5 },
  { name: 'Arkansas', abbr: 'AR', col: 5, row: 5 },
  { name: 'Tennessee', abbr: 'TN', col: 6, row: 5 },
  { name: 'North Carolina', abbr: 'NC', col: 7, row: 5 },
  { name: 'South Carolina', abbr: 'SC', col: 8, row: 5 },
  { name: 'District of Columbia', abbr: 'DC', col: 9, row: 5 },
  { name: 'Oklahoma', abbr: 'OK', col: 4, row: 6 },
  { name: 'Louisiana', abbr: 'LA', col: 5, row: 6 },
  { name: 'Mississippi', abbr: 'MS', col: 6, row: 6 },
  { name: 'Alabama', abbr: 'AL', col: 7, row: 6 },
  { name: 'Georgia', abbr: 'GA', col: 8, row: 6 },
  { name: 'Hawaii', abbr: 'HI', col: 0, row: 7 },
  { name: 'Texas', abbr: 'TX', col: 4, row: 7 },
  { name: 'Florida', abbr: 'FL', col: 9, row: 7 }
]

export const GRID_COLS = 12
export const GRID_ROWS = 8

// A simple 4-cell layout for the Regions view — not meant to be precise
// (there's no sensible way to grid-position 4 giant regions exactly), just
// roughly compass-shaped: West on the left, the Northeast/Midwest pair up
// top, South centered underneath spanning the middle.
export const REGION_GRID = [
  { name: 'West', abbr: 'W', col: 0, row: 0 },
  { name: 'Midwest', abbr: 'MW', col: 1, row: 0 },
  { name: 'Northeast', abbr: 'NE', col: 2, row: 0 },
  { name: 'South', abbr: 'S', col: 1, row: 1 }
]
export const REGION_GRID_COLS = 3
export const REGION_GRID_ROWS = 2
