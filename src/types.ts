// CarbonBridge — shared domain types.
// POC uses mock data only; these types are shaped so the layer could later
// swap to the real sources listed in docs/MOCK_DATA.md.

export type Confidence = 'low' | 'medium' | 'high'

// Production route drives the emissions benchmark for steel (BF-BOF is far
// more carbon-intensive than scrap-fed EAF). Sourced in real life from the
// Global Steel Plant Tracker. "n/a" for non-steel commodities.
export type ProductionRoute = 'BF-BOF' | 'EAF' | 'mixed' | 'n/a'

export type CommodityGroup =
  | 'steel'
  | 'aluminium'
  | 'cement'
  | 'fertiliser'
  | 'electricity'
  | 'hydrogen'

/** An estimate is ALWAYS carried as a range + confidence, never a hard number. */
export interface EstimateRange {
  low: number
  high: number
}

export interface Supplier {
  id: string
  /** The name the importer actually has — often a trader/distributor, NOT the mill. */
  name: string
  /** The producing installation, when resolved. May be undefined (unknown). */
  facilityName?: string
  country: string
  /** ISO-2 (lowercase) for flag emoji / lookups. */
  countryCode: string
  lat: number
  lon: number
  commodity: CommodityGroup
  /** CBAM CN code (8-digit). */
  cnCode: string
  productionRoute: ProductionRoute

  // --- Emissions intensity, tCO2e per tonne of product ---
  /** What the supplier self-declares. */
  selfReported: number
  /** Independent (Climate TRACE–style modeled) estimate, carried as a RANGE. */
  independentEstimate: EstimateRange
  /** Confidence in the independent estimate. Drives whether we flag at all. */
  estimateConfidence: Confidence
  /** Punitive country/CN-specific CBAM default (Reg. (EU) 2025/2621), pre-markup. */
  countryDefaultValue: number
  /** EU best-practice benchmark intensity for the commodity/route. */
  benchmark: number

  // --- Commercial context ---
  /** Tonnes/year this importer brings in from this supplier. */
  annualTonnesImported: number
  /** Whether this supplier's verified data already lives in the shared pool. */
  inSharedPool: boolean

  // --- Entity resolution (NEVER claimed as automatic) ---
  matchConfidence: Confidence
  matchBasis: string

  // --- Real provenance (Climate TRACE) ---
  /** Climate TRACE source_id → links to the multi-year series in history.json. */
  historyId?: number
  /** Resolved owner from Climate TRACE ownership data (real). */
  owner?: { parent: string; lei: string | null; hq: string | null }
  /**
   * Cradle-to-gate intensity incl. purchased electricity (tCO₂e/t). For steel &
   * aluminium this is mostly OUT of CBAM scope — shown for context, not pricing.
   */
  fullFootprint?: number
}

/** Output of the verification-priority triage check for one supplier. */
export interface FlagResult {
  flagged: boolean
  /** (estimateMid − selfReported) / estimateMid, as a fraction. Positive = under-reporting. */
  divergence: number
  reason: string
  severity: 'none' | 'watch' | 'priority'
}

/** One year's slice of the cost forecast. */
export interface ForecastYear {
  year: number
  cbamFactor: number
  status: 'accruing' | 'first-payment' | 'scaling'
  /** Cost if forced onto punitive default values. */
  defaultCost: number
  /** Cost using verified/actual supplier intensity. */
  verifiedCost: number
  /** defaultCost − verifiedCost: the avoidable overpayment. */
  avoidable: number
}
