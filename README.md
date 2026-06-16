# CarbonBridge

> A CBAM verification, triage, and cost-forecasting workspace for mid-market EU importers. Proof-of-concept, mock data.

## What it is

CarbonBridge is a **frontend-only proof-of-concept** built with React + Vite + TypeScript + Tailwind + Recharts + react-simple-maps. All data is **mock JSON living in `src/data`**. There is **no backend** — this is deliberate. Going frontend-only sidesteps the two hardest real-world problems (entity resolution between traders/distributors and specific producing facilities, and the data-pipeline plumbing) so the POC can focus on telling the product story clearly to a sharp audience.

## The persona

The workspace is framed around **Meridian Metals BV**, a **mid-market importer** bringing in **well over 50 tonnes/year** of steel and aluminium. That threshold matters: the EU's Omnibus simplification introduced a **50-tonne exemption that removed roughly 90% of the smallest importers** from CBAM scope. Meridian sits comfortably above it — exactly the kind of company that still has a real, growing CBAM obligation but lacks a large in-house compliance team.

## Navigate by material

An importer thinks in the materials they declare, so a single global **material lens** (`All / Steel / Aluminium / Cement`) pinned in the sidebar scopes **every** screen at once. Behind that lens there are **four focused screens**:

1. **Overview** — the command centre: a live to-do queue (where to request verified data), the accruing-liability cost curve and *avoidable overpayment* (punitive defaults vs. verified actuals) with a per-supplier breakdown for any year you pick, and the **facility map** (emissions intensity + import demand, geographically). Independent estimates always shown as a **range + confidence label**, never a single hard number.
2. **Suppliers** — verify-first triage **and** the verification workflow on one screen: a tunable sensitivity slider, a priority queue of suppliers whose self-report diverges below the independent estimate (a **private triage signal**, never a public accusation — see `docs/SPEC.md`), and a full tracker table (flagged → unverified → requested → received → pool).
3. **Simulator & ledger** — what-if modelling of the payoff from supplier decarbonisation; every supplier has its own slider and the impact ledger sums the lot.
4. **Evidence** — the real measured Climate TRACE data (emissions/production by year, CBAM-scope vs out-of-scope footprint, an auditable owner + LEI provenance table) **plus live feeds** proving the pipeline is real: the **UK Carbon Intensity API** (live GB grid intensity + generation mix) and the **GLEIF LEI API** (company-identity lookup with a match-confidence score). See `docs/MOCK_DATA.md`.

## The honest CBAM timeline

This is the cost story we tell, and it is accurate:

- The CBAM **definitive phase began 1 January 2026**.
- In **2026, liability only *accrues* at a 2.5% CBAM factor** — so the 2026 net cost is small (single-digit €/tonne).
- **Certificate sales begin February 2027.**
- The **first declaration and certificate surrender is due 30 September 2027** (covering 2026 imports).
- **Free allocation phases out through 2034**, when the CBAM factor reaches 100%.

So the message is **"accruing now, first bill September 2027, climbing steeply through 2034"** — *not* "you're hemorrhaging money today." The value is in an accurate trajectory, not an overstated near-term number.

## Run it

```bash
npm install
npm run dev      # opens at http://localhost:5173
npm run build    # typecheck + production build
```

## A note on the numbers

All figures in this POC are **illustrative mock values**, calibrated to published orders of magnitude but not drawn from live systems. The reference for where the real production data would come from is in [`docs/MOCK_DATA.md`](docs/MOCK_DATA.md).
