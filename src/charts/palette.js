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

// Sequential scale for a single magnitude (e.g. StateGridMap.vue). One
// hue, light -> dark, per the dataviz skill's rule for sequential data —
// but varying LIGHTNESS at fixed hue/saturation (HSL), not a straight RGB
// blend toward white. A plain RGB lerp from white to an orange/red hue
// passes through a low-chroma, muddy "brown" band in the middle that's
// genuinely hard to read step-to-step (reported directly against
// StateGridMap.vue); holding saturation high and only varying lightness
// avoids that dead zone, and blue reads with more steps than orange did.
// Reuses an already-validated categorical slot's hue rather than
// introducing an unvalidated new one.
export function sequentialFor(t, hex = SERIES[0]) {
  const [h, s] = hexToHsl(hex)
  const clamped = Math.max(0, Math.min(1, t))
  // 92% (near-white, but never fully white — even t=0 stays a hair
  // identifiable as "on the scale") down to 22% (dark, not black).
  const lightness = 92 - clamped * 70
  return hslToRgbString(h, s, lightness)
}

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0)
      break
    case g:
      h = (b - r) / d + 2
      break
    default:
      h = (r - g) / d + 4
  }
  return [h * 60, s * 100]
}

function hslToRgbString(h, s, l) {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)
  return `rgb(${r}, ${g}, ${b})`
}

// Chrome tokens reused inside charts (mirror src/style.css @theme).
export const GRID_LINE = '#e5e5e5' // --color-line
export const AXIS_TEXT = '#737373' // --color-muted
export const MUTED_MARK = '#a3a3a3' // --color-muted-soft (partial-period cue)
export const TOOLTIP_BG = '#0a0a0a' // --color-ink
