// CarbonBridge — LIVE data integrations.
//
// Everything else in this app is mock. These two functions are genuinely wired
// to free, public, no-key, CORS-enabled APIs, so the demo can show a real data
// pipeline (not just talk about one):
//
//   1. UK Carbon Intensity API (api.carbonintensity.org.uk) — live GB grid
//      carbon intensity + generation mix. No key, no signup. This is the source
//      the team cheat-sheet flagged as "safe to actually plug in."
//   2. GLEIF LEI API (api.gleif.org) — real global company-identity records,
//      backing the entity-resolution story (LEI + confidence + manual confirm).
//
// Honesty notes are surfaced in the UI: GB grid != a Chinese smelter's grid, and
// Climate TRACE assets carry no LEI so the facility join stays manual.

const GRID_BASE = 'https://api.carbonintensity.org.uk'
const GLEIF_BASE = 'https://api.gleif.org/api/v1'

export interface GridIntensity {
  from: string
  to: string
  forecast: number
  actual: number | null
  index: string // 'very low' | 'low' | 'moderate' | 'high' | 'very high'
}

export async function fetchGridIntensity(): Promise<GridIntensity> {
  const res = await fetch(`${GRID_BASE}/intensity`)
  if (!res.ok) throw new Error(`Carbon Intensity API returned ${res.status}`)
  const j = await res.json()
  const d = j.data[0]
  return {
    from: d.from,
    to: d.to,
    forecast: d.intensity.forecast,
    actual: d.intensity.actual,
    index: d.intensity.index,
  }
}

export interface FuelShare {
  fuel: string
  perc: number
}

export async function fetchGenerationMix(): Promise<{
  from: string
  to: string
  mix: FuelShare[]
}> {
  const res = await fetch(`${GRID_BASE}/generation`)
  if (!res.ok) throw new Error(`Generation Mix API returned ${res.status}`)
  const j = await res.json()
  return { from: j.data.from, to: j.data.to, mix: j.data.generationmix }
}

export interface LeiMatch {
  lei: string
  name: string
  country: string
  city: string
  status: string // ACTIVE / INACTIVE
  registrationStatus: string // ISSUED / LAPSED / ...
}

export async function searchLei(name: string): Promise<LeiMatch[]> {
  const q = encodeURIComponent(name.trim())
  // Bracketed JSON:API params are pre-encoded so the keys survive the query string.
  const url =
    `${GLEIF_BASE}/lei-records?filter%5Bentity.legalName%5D=${q}&page%5Bsize%5D=8`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GLEIF API returned ${res.status}`)
  const j = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (j.data ?? []).map((r: any) => ({
    lei: r.id,
    name: r.attributes?.entity?.legalName?.name ?? '—',
    country: r.attributes?.entity?.legalAddress?.country ?? '—',
    city: r.attributes?.entity?.legalAddress?.city ?? '',
    status: r.attributes?.entity?.status ?? '—',
    registrationStatus: r.attributes?.registration?.status ?? '—',
  }))
}

/** Naive token-overlap similarity (0–1) — supports the "match confidence" UX. */
export function nameSimilarity(query: string, candidate: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  const a = new Set(norm(query))
  const b = new Set(norm(candidate))
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  a.forEach((t) => b.has(t) && inter++)
  return inter / (a.size + b.size - inter)
}

export function similarityLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.6) return 'high'
  if (score >= 0.3) return 'medium'
  return 'low'
}
