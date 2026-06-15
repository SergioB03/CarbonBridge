import type { Supplier, Confidence, CommodityGroup, ProductionRoute } from '../types'
import history from './history.json'

// CarbonBridge — supplier book derived from REAL Climate TRACE facility data
// (src/data/history.json, manufacturing v5.7.0, CC BY 4.0) plus a CBAM policy +
// commercial overlay. The independent estimate, owner, LEI, location, route and
// full-footprint are REAL. Self-reported figures are ILLUSTRATIVE supplier
// claims (no public registry of self-reports exists yet), and the CBAM default
// values / benchmarks / import volumes are anchored to published numbers where
// available, illustrative otherwise. See docs/MOCK_DATA.md.
//
// Persona: "Meridian Metals BV" — a mid-market importer (> 50 t/yr) sourcing
// steel, aluminium and cement precursors from these real producers.

export const IMPORTER = {
  name: 'Meridian Metals BV',
  country: 'Netherlands',
  eori: 'NL812493579',
  note: 'Mid-market importer, > 50 t/year (above the Omnibus exemption).',
}

const ISO2: Record<string, string> = {
  KOR: 'kr', CHN: 'cn', IND: 'in', TUR: 'tr', VNM: 'vn', ARE: 'ae',
}

interface Overlay {
  commodity: CommodityGroup
  cnCode: string
  route: ProductionRoute
  /** ILLUSTRATIVE supplier self-reported intensity (tCO₂/t). */
  selfReported: number
  /** Punitive CBAM default (Reg. (EU) 2025/2621), anchored where known. */
  countryDefaultValue: number
  /** EU best-practice benchmark for the route (BF/BOF 1.37, DRI/EAF 0.481, …). */
  benchmark: number
  annualTonnesImported: number
  inSharedPool: boolean
  matchConfidence: Confidence
  matchBasis: string
}

// keyed by Climate TRACE source_id
const OVERLAY: Record<string, Overlay> = {
  '1566956': { // POSCO Gwangyang (KOR, BF/BOF) — consistent, verified
    commodity: 'steel', cnCode: '72083900', route: 'BF-BOF',
    selfReported: 1.95, countryDefaultValue: 2.71, benchmark: 1.37,
    annualTonnesImported: 2600, inSharedPool: true, matchConfidence: 'high',
    matchBasis: 'country + CN code + named installation (verified in pool)',
  },
  '1566610': { // Angang (CHN, BF/BOF) — under-reports vs real → flagged
    commodity: 'steel', cnCode: '72071100', route: 'BF-BOF',
    selfReported: 1.42, countryDefaultValue: 3.167, benchmark: 1.37,
    annualTonnesImported: 4200, inSharedPool: false, matchConfidence: 'medium',
    matchBasis: 'country + CN code; named installation unconfirmed (trader-fronted)',
  },
  '1566853': { // Tata Jamshedpur (IND, BF/BOF) — consistent, verified
    commodity: 'steel', cnCode: '72082700', route: 'BF-BOF',
    selfReported: 1.92, countryDefaultValue: 3.02, benchmark: 1.37,
    annualTonnesImported: 3100, inSharedPool: true, matchConfidence: 'high',
    matchBasis: 'country + CN code + named installation (verified in pool)',
  },
  '1567076': { // MMK Türkiye (TUR, EAF) — clean scrap/EAF route
    commodity: 'steel', cnCode: '72142000', route: 'EAF',
    selfReported: 0.49, countryDefaultValue: 2.0, benchmark: 0.481,
    annualTonnesImported: 1900, inSharedPool: false, matchConfidence: 'high',
    matchBasis: 'country + CN code + named EAF installation',
  },
  '1897887': { // Körfez Cement (TUR) — big default-vs-actual gap
    commodity: 'cement', cnCode: '25232900', route: 'n/a',
    selfReported: 0.80, countryDefaultValue: 1.584, benchmark: 0.7,
    annualTonnesImported: 5200, inSharedPool: false, matchConfidence: 'high',
    matchBasis: 'country + CN code + named clinker plant',
  },
  '32439362': { // Vissai Do Luong (VNM cement)
    commodity: 'cement', cnCode: '25232900', route: 'n/a',
    selfReported: 0.55, countryDefaultValue: 0.95, benchmark: 0.7,
    annualTonnesImported: 3000, inSharedPool: false, matchConfidence: 'medium',
    matchBasis: 'country + CN code; producing kiln inferred',
  },
  '3672937': { // Taweelah / EGA (ARE alu) — CBAM-scope vs full-footprint story
    commodity: 'aluminium', cnCode: '76011000', route: 'n/a',
    selfReported: 2.1, countryDefaultValue: 4.0, benchmark: 1.514,
    annualTonnesImported: 1400, inSharedPool: false, matchConfidence: 'medium',
    matchBasis: 'country + CN code; smelter inferred from grid + GEM tracker',
  },
  '3673075': { // Jharsuguda / Vedanta (IND alu)
    commodity: 'aluminium', cnCode: '76012000', route: 'n/a',
    selfReported: 2.4, countryDefaultValue: 4.0, benchmark: 1.514,
    annualTonnesImported: 1150, inSharedPool: true, matchConfidence: 'high',
    matchBasis: 'country + CN code + named smelter (verified in pool)',
  },
}

// Confidence → ± band on the real measured intensity (the independent estimate
// range is derived from Climate TRACE's own confidence flag, not invented).
const BAND: Record<Confidence, number> = { high: 0.06, medium: 0.1, low: 0.2 }
const r2 = (n: number) => Math.round(n * 100) / 100

export const SUPPLIERS: Supplier[] = history.facilities.map((f) => {
  const o = OVERLAY[String(f.id)]
  const intensity = f.latest.intensity // real, CBAM-scope
  const band = BAND[f.confidence as Confidence]
  return {
    id: `ct-${f.id}`,
    name: `${shortOwner(f.owner.parent)} — ${shortPlant(f.name)}`,
    facilityName: f.name,
    country: f.country,
    countryCode: ISO2[f.country] ?? 'un',
    lat: f.lat ?? 0,
    lon: f.lon ?? 0,
    commodity: o.commodity,
    cnCode: o.cnCode,
    productionRoute: o.route,
    selfReported: o.selfReported,
    independentEstimate: { low: r2(intensity * (1 - band)), high: r2(intensity * (1 + band)) },
    estimateConfidence: f.confidence as Confidence,
    countryDefaultValue: o.countryDefaultValue,
    benchmark: o.benchmark,
    annualTonnesImported: o.annualTonnesImported,
    inSharedPool: o.inSharedPool,
    matchConfidence: o.matchConfidence,
    matchBasis: o.matchBasis,
    historyId: f.id,
    owner: f.owner,
    fullFootprint: f.latest.fullIntensity ?? undefined,
  }
})

function shortOwner(p: string): string {
  return p
    .replace(/\b(Holdings|Inc|Ltd|PJSC|AŞ|Co|Corporation of|Sanayi)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ')
}
function shortPlant(n: string): string {
  return n.replace(/\b(steel plant|aluminium plant|Cement Plant|plant)\b/gi, '').replace(/\s+/g, ' ').trim()
}
