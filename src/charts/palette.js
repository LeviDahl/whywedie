// Chart palette.
//
// The site chrome — sidebar, headers, buttons, cards — stays strictly
// black / white / gray (see src/style.css). Colour lives ONLY inside the
// chart plot areas, to keep multiple series and period-vs-period
// comparisons legible.
//
// Values are the light-mode categorical slots from the data-viz reference
// palette, in canonical order. Validated (scripts/validate_palette.js):
// worst adjacent CVD ΔE 9.1, normal-vision ΔE 22.9 — all hard gates pass.
// Slots 3–4 (aqua, yellow) sit just under 3:1 against white, so identity is
// never left to colour alone: every multi-series chart shows a legend, line
// series also carry a dash pattern, and grouped bars keep a gap + hover
// tooltip.

export const SERIES = [
  '#2a78d6', // 1 · blue
  '#eb6834', // 2 · orange
  '#1baf7a', // 3 · aqua
  '#eda100' // 4 · yellow
]

// Per-series line dash (secondary encoding for CVD / greyscale print).
export const SERIES_DASH = [[], [6, 3], [2, 3], [9, 4, 2, 4]]

// Translucent version of a series colour, for a single-series area fill.
export function fillFor(hex, alpha = 0.1) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Chrome tokens reused inside charts (mirror src/style.css @theme).
export const GRID_LINE = '#e5e5e5' // --color-line
export const AXIS_TEXT = '#737373' // --color-muted
export const MUTED_MARK = '#a3a3a3' // --color-muted-soft (partial-period cue)
export const TOOLTIP_BG = '#0a0a0a' // --color-ink
