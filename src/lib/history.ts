import data from '../data/history.json'

// CarbonBridge — accessor for the REAL Climate TRACE historical extract.
// Static data; no live API at runtime (the Climate TRACE beta API is unreliable
// for production, so we pre-extracted the manufacturing package — see docs).

export interface HistYear {
  year: number
  intensity: number
  fullIntensity: number | null
  emissions: number
  production: number
  partial: boolean
}
export interface HistFacility {
  id: number
  name: string
  country: string
  subsector: string
  route: string
  lat: number | null
  lon: number | null
  owner: { parent: string; lei: string | null; hq: string | null }
  unit: string
  confidence: string
  observedIntensity: { low: number; high: number }
  latest: { year: number; intensity: number; fullIntensity: number | null }
  series: HistYear[]
  /** True for the Americas comparators: real plant/owner/LEI, calibrated numbers,
   *  NOT from the Climate TRACE static extract. */
  illustrative?: boolean
}

export const HISTORY = data as unknown as {
  source: string
  release: string
  note: string
  pulled: string
  facilities: HistFacility[]
}

export function facilityFor(id?: number): HistFacility | undefined {
  return HISTORY.facilities.find((f) => f.id === id)
}

/** First and last full (non-partial) observed years. */
export function observedRange(f: HistFacility): [number, number] {
  const full = f.series.filter((s) => !s.partial)
  return [full[0]?.year ?? f.series[0].year, full[full.length - 1]?.year ?? f.series[f.series.length - 1].year]
}
