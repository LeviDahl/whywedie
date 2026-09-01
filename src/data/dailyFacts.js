// Scale-comparison facts for the "By the Numbers" page — how often some
// everyday thing happens, to sit next to the CDC birth/death figures.
//
// These are deliberately ROUGH: widely-cited ballpark estimates from
// assorted public sources, shown as an annual figure ÷ 365. The page labels
// them as estimates and shows the source. Not health data, not precise.

export const DAILY_FACTS = [
  { label: 'pizzas are made in the US', perYear: 3_000_000_000, scope: 'US', source: 'US pizza-industry estimates' },
  { label: 'cups of coffee are drunk in the US', perYear: 146_000_000_000, scope: 'US', source: 'National Coffee Association' },
  { label: 'text messages are sent in the US', perYear: 2_000_000_000_000, scope: 'US', source: 'CTIA wireless survey' },
  { label: 'eggs are produced in the US', perYear: 110_000_000_000, scope: 'US', source: 'USDA' },
  { label: 'chickens are raised for meat in the US', perYear: 9_200_000_000, scope: 'US', source: 'National Chicken Council' },
  { label: 'hot dogs are eaten in the US', perYear: 20_000_000_000, scope: 'US', source: 'National Hot Dog & Sausage Council' },
  { label: 'disposable diapers are used in the US', perYear: 27_000_000_000, scope: 'US', source: 'US EPA' },
  { label: 'miles are driven on US roads', perYear: 3_200_000_000_000, scope: 'US', source: 'US Federal Highway Administration' },
  { label: 'babies are born worldwide', perYear: 134_000_000, scope: 'World', source: 'UN World Population Prospects' },
  { label: 'people die worldwide', perYear: 62_000_000, scope: 'World', source: 'UN World Population Prospects' },
  { label: 'cars are built worldwide', perYear: 85_000_000, scope: 'World', source: 'OICA' },
  { label: 'commercial flights take off worldwide', perYear: 38_000_000, scope: 'World', source: 'ICAO / industry estimates' },
  { label: 'lightning bolts strike the Earth', perYear: 1_400_000_000, scope: 'World', source: 'NOAA (~44 per second)' },
  { label: 'trees are cut down worldwide', perYear: 15_000_000_000, scope: 'World', source: 'Crowther et al., Nature (2015)' },
  { label: 'plastic bottles are sold worldwide', perYear: 480_000_000_000, scope: 'World', source: 'Euromonitor' },
  { label: 'Big Macs are sold worldwide', perYear: 900_000_000, scope: 'World', source: "McDonald's (widely cited)" }
]

export function perDay(fact) {
  return fact.perYear / 365
}

function todaySeed() {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

// Deterministic pick by default (everyone sees the same set on a given day);
// pass a random seed to reshuffle.
export function pickFacts(count = 3, seed = todaySeed()) {
  const arr = [...DAILY_FACTS]
  let s = seed >>> 0 || 1
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, count)
}
