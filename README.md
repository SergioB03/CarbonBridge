# CarbonBridge

> A CBAM verification, triage, and cost-forecasting workspace for mid-market EU importers. Proof-of-concept, mock data.

## What it is

CarbonBridge is a **frontend-only proof-of-concept** built with React + Vite + TypeScript + Tailwind + Recharts + react-simple-maps. All data is **mock JSON living in `src/data`**. There is **no backend** — this is deliberate. Going frontend-only sidesteps the two hardest real-world problems (entity resolution between traders/distributors and specific producing facilities, and the data-pipeline plumbing) so the POC can focus on telling the product story clearly to a sharp audience.

## The persona

The workspace is framed around **Meridian Metals BV**, a **mid-market importer** bringing in **well over 50 tonnes/year** of steel and aluminium. That threshold matters: the EU's Omnibus simplification introduced a **50-tonne exemption that removed roughly 90% of the smallest importers** from CBAM scope. Meridian sits comfortably above it — exactly the kind of company that still has a real, growing CBAM obligation but lacks a large in-house compliance team.

## Six views

1. **Dashboard** — accruing liability over time plus the *avoidable overpayment* (the gap between paying punitive defaults vs. verified actual emissions).
2. **Comparison shelf** — ranks suppliers by carbon cost. Independent estimates are always shown as a **range + confidence label**, never a single hard number.
3. **Facility map** — emissions intensity per facility alongside network/demand context.
4. **Verification Priority Flag** — a **private triage signal** (visible only in the importer's own view) highlighting where a supplier's self-reported figure diverges from the independent estimate, so a small team knows where to spend its limited verification budget. It is *not* a public accusation. (See `docs/SPEC.md` for the full framing.)
5. **Simulator & ledger** — what-if modelling of the payoff from supplier decarbonisation decisions; every supplier has its own slider and the impact ledger sums the lot.
6. **Live data** — two production sources wired in for real (no keys, no backend): the **UK Carbon Intensity API** (live GB grid intensity + generation mix) and the **GLEIF LEI API** (company-identity lookup with a match-confidence score). Everything else is mock; this tab proves the pipeline is real. See `docs/MOCK_DATA.md`.

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
