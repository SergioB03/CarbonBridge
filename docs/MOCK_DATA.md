# CarbonBridge — Mock Data & Production Sources

The POC runs entirely on **mock JSON** (`src/data/suppliers.ts`, `src/data/cbam.ts`). All numbers are **illustrative** but **calibrated to published orders of magnitude**. This file is the **"where would the real data come from?"** reference for the data-sourcing and architecture questions.

## Live integrations (actually wired, no mock)

Two production sources are **genuinely live** in the app today — see the **Live data** tab. Both are free, need no API key, and are CORS-enabled so they run straight from the browser with no backend:

| Source | Endpoint | What it proves |
|---|---|---|
| **UK Carbon Intensity API** | `api.carbonintensity.org.uk/intensity` + `/generation` | Live GB grid carbon intensity (gCO₂/kWh) + generation mix. The grid feed the cheat-sheet flagged as safe to plug in. |
| **GLEIF LEI API** | `api.gleif.org/api/v1/lei-records` | Real global company-identity lookup with a match-confidence score — the entity-resolution layer, with a manual-confirm step (never auto-resolve). |

Honest scope, surfaced in the UI: GB grid data is a real *proof of pipeline*, not a stand-in for a non-EU smelter's grid; and Climate TRACE assets carry no LEI, so the company→facility join stays semi-manual. Everything else below remains documented-but-mock for the POC.

## Production data sources (named, free)

| Layer | Primary source | Notes / why |
|---|---|---|
| Non-EU producer facilities (steel/cement/alu) | Global Energy Monitor trackers (Global Steel Plant Tracker, etc.) | Plant-level location, ownership, **and production route (BF-BOF vs EAF)** — the field that drives the emissions benchmark. Underpins Climate TRACE's own ownership data. |
| Facility direct emissions (independent) | Climate TRACE (**bulk CSV — download at kickoff, don't hit the beta API live**) + EDGAR (EC JRC) for independent country/sector baselines | Climate TRACE API is explicitly **beta** ("cannot guarantee availability") — pre-cache the CSV. EDGAR gives a credible independent baseline without facility over-claiming. |
| EU-side installations (entity resolution / benchmarking) | EU Industrial Emissions Portal (E-PRTR / IED) | ~33k–50k+ European installations with CO2 + location. Free. |
| Grid carbon intensity (indirect emissions) | Ember (CC-BY); alternatives WattTime / GridEmissionsData.io (marginal MOER), UK National Grid ESO API (free, no key), UNFCCC harmonized grid factors | Use **AVERAGE** intensity for the declaration math; use **MARGINAL** for the "what if they switched" simulation. |
| Company identity / entity resolution | GLEIF LEI (CC0, incl. parent/child ownership) + OpenCorporates + EORI validation | LEI is the spine for the **importer/registry** side. **CAVEAT:** Climate TRACE assets carry **no LEI**, so this helps the importer side, not the facility join — that join stays hand-curated for the demo. |
| Trade flows by CN code | Eurostat Comext / PRODCOM (SDMX API + bulk CSV, free) | Aggregate only; named importer-level transactions are paywalled. |
| CBAM codes / default values / cert price | EU Commission CBAM site + Reg. (EU) 2025/2621 (defaults) + Commission's official quarterly certificate price | The cert price is a **QUARTERLY AVERAGE**, not a live spot price. |
| EU ETS price (UX flavour) | Sandbag Carbon Price Viewer / ICAP / Trading Economics / datahub.io EUTL | Free EUA price for charts; the **legal** number is the Commission quarterly average above. |
| Satellite "independent observation" layer | Copernicus Sentinel-5P / TROPOMI (free; also AWS Open Data), Sentinel-2, VIIRS night-lights, OpenAQ | **STATE THE LIMIT HONESTLY:** ~km-scale resolution shows a regional plume / activity proxy, **NOT** a single facility's CO2. Use night-lights / Sentinel-2 as an "is this plant active / expanding" signal, not a CO2 accusation. |

## Production-stack note (for the "how would you build it for real?" question)

For a real build: **Aurora Serverless v2** (Postgres, JSONB for provenance/confidence) + **Lambda** + **Amplify** + **Bedrock** (copilot + fuzzy name matching), funded on **AWS Activate credits** ($1,000 Founders / up to $200k Portfolio) plus the new **Free Tier** ($100–$200). A faster non-AWS alternative is **Supabase + Vercel**. **None of this is in the POC** — it's purely the answer to the architecture question.

## Mock data fields per supplier

Each supplier record in the mock data carries:

- `selfReported` — the supplier's self-reported emissions figure.
- `independentEstimate` `{ low, high }` — the independent estimate, always a **range**.
- `estimateConfidence` — confidence label for that estimate.
- `productionRoute` — `BF-BOF` or `EAF` (drives the benchmark).
- `countryDefaultValue` — the punitive country/CN default.
- `cnCode` — the CN classification code.
- `benchmark` — the EU benchmark for the product/route.
- `annualTonnesImported` — Meridian's annual import volume from this supplier.
- `inSharedPool` — whether this supplier's verified data is contributed to the cross-company pool.
- `matchConfidence` — confidence score for the supplier→facility match.
- `matchBasis` — what the match was based on (country + CN code + named installation, etc.).
