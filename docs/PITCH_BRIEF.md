# CarbonBridge — Hackathon Pitch Brief

> **How to use this file:** Paste this whole document into a fresh Claude chat and say:
> *"Help me write a 2–3 minute hackathon pitch script + a demo walkthrough + answers to the tough Q&A, based on this brief. The judges lean business, not deeply technical."*
> Everything Claude needs is below — it doesn't need to see the code.

---

## 0. The one-liner

**CarbonBridge is the honest, real-data way for mid-market EU importers to survive CBAM — it tells them what their carbon tariff will really cost, how much of that cost is avoidable, and which suppliers to chase for verified data first.**

The differentiator is **trust through honesty**: real independent emissions data, shown as ranges with confidence, never as accusations — plus a cross-company "Verified Pool" that compounds into a data moat.

---

## 1. The problem (say this plainly)

**CBAM** = the EU's **Carbon Border Adjustment Mechanism** — a carbon tariff on imports of steel, aluminium, cement (and a few others). EU producers already pay for emissions under the EU ETS; importers must now pay an equivalent on the carbon *embedded* in what they bring in.

The cost mechanic:
```
cost = embedded_emissions × CBAM_factor × certificate_price
embedded_emissions = tonnes_imported × emissions_intensity (tCO₂e per tonne)
```

Three pains for a mid-market importer — CarbonBridge solves each:
1. **You must prove an emissions intensity per supplier.** Can't prove it → the EU forces you onto a **punitive default value** (deliberately set high, with an escalating mark-up). CarbonBridge quantifies the **avoidable overpayment** = default cost − verified cost.
2. **You can't verify every supplier at once.** A small team has a limited budget. CarbonBridge produces a **private triage signal** pointing at the suppliers whose self-reported numbers diverge most from an independent estimate.
3. **The cost ramps; it isn't flat.** 2026 is nearly free; the first real bill is Sept 2027; full rate is 2034. We model the true trajectory instead of a scary fake big-today number.

---

## 2. The customer (persona)

**Meridian Metals BV** — a fictional but representative **mid-market EU importer** (Netherlands, EORI on screen), importing **just over 50 tonnes/year** of steel & aluminium.

Why that threshold matters: the EU's **Omnibus simplification (Reg. (EU) 2025/2083)** created a **50-tonne exemption that removed ~90% of the smallest importers** from CBAM. Meridian sits *just above* it — a real, growing obligation but **no in-house compliance team**. That's the underserved market.

---

## 3. The moat / why we win (the business core)

**It's a data-ownership model, not a feature checklist.**

1. **The Verified Pool (the moat).** A supplier verifies **once** — by signing a **data-sharing consent** — and that verified figure is **reused across every unaffiliated importer** who sources from them. No re-auditing, no re-collection. The pool compounds with the network.
2. **The independent estimate (the cold-start).** Before the pool has depth, the independent estimate already gives a single importer something useful on day one: *where to focus scrutiny.* So we're valuable to importer #1, and more valuable to importer #100.

**Why suppliers join (buyer-pull, evidenced):** CDP's 2024 supply-chain data found suppliers were **52% more likely to cut emissions when buyers ask/incentivise**, and buyer engagement drove **43 Mt of reductions** (more than Sweden's annual emissions). Importers pull suppliers into the pool; the consent model makes it feel like an exclusive, transparent verified club.

---

## 4. What's actually real vs illustrative (DO NOT overclaim — this is the whole pitch)

| Layer | Status |
|---|---|
| 8 core facilities — owners, **LEIs**, locations, routes, multi-year emissions intensity, scope-vs-full-footprint | **REAL** — static extract from **Climate TRACE** (manufacturing v5.7.0, CC BY 4.0) |
| 4 Americas comparators (Nucor, Alcoa, Gerdau, Albras) | **Real identity** (real plant, owner, GLEIF-verified LEI) with **calibrated** emissions; marked **"est."** |
| **GLEIF LEI lookup** (Evidence tab) | **REAL & LIVE** from the browser — no key, no backend |
| **UK Carbon Intensity API** (live GB grid intensity + generation mix) | **REAL & LIVE** from the browser |
| Supplier **self-reported** figures, CBAM **default values / cert price**, Simulator **CapEx** presets | **Illustrative**, calibrated to published orders of magnitude |

**Golden rule for the pitch:** be bold about the *vision* verbally, but never let the screen claim something it isn't. Every number on screen is either real or labelled illustrative. That discipline is your credibility.

---

## 5. The demo walkthrough (what to click, what to say)

The app has a **light, premium UI**, a global **Material Lens** (All / Steel / Aluminium / Cement) in the sidebar that **rescopes every screen at once**, and an **Operator ↔ Pitch/Judge** toggle (Pitch mode reveals methodology callouts — use it for judges). Four screens:

1. **Overview (land here).**
   - Top: live countdown to the **30 Sep 2027** first declaration, 2026 accruing liability, **cumulative avoidable overpayment**, suppliers needing action.
   - The **Leaflet satellite map** — toggle Standard ↔ Satellite, click a facility, watch the "fly-to." Trade lines run to the Rotterdam HQ.
   - **Section 02 cost curve (2026–2034):** red = punitive defaults, green = verified actuals; the gap is the avoidable premium. **Click a supplier card and the curve + ledger redraw for just that supplier** (great "it's alive" moment); click again for the whole book.
   - *Money line:* "The red-green gap is money you can avoid simply by proving real data instead of accepting punitive defaults."

2. **Suppliers (the triage).**
   - A **sensitivity slider** + a **"Verify first" queue** of suppliers whose self-report diverges below the independent estimate. Drag the slider; the queue recomputes live.
   - *Critical framing:* this is a **private triage signal, never a public accusation.** It says *"diverges — recommend verification,"* always as a **range + confidence**, never "this company lied."
   - The **Verified Pool** consent story lives here too.

3. **Simulator (the payoff).**
   - One slider per supplier (+ green-retrofit presets). Drag intensity down → watch **2030 savings, cumulative 2026–34 savings, CO₂ cut, and the live cost-shelf ranking** all move.
   - *Line:* "This is the ROI of pulling a supplier into the Verified Pool."

4. **Evidence (the proof).**
   - Real measured Climate TRACE history, an auditable **owner + LEI provenance table**, and the **two genuinely live feeds** (UK grid + GLEIF). Type a company name → real GLEIF records resolve live.
   - *Killer beat:* the **Alcoa vs Albras aluminium contrast** — same ~2.5 CBAM-priced intensity, but full cradle-to-gate footprint ~12 (US coal grid) vs ~4 (Brazil hydro). Shows how much of aluminium's real footprint is grid electricity that CBAM doesn't even price.

---

## 6. Hero numbers & talking points

- **Avoidable overpayment** (default vs verified) — the headline € figure on Overview. This is the value proposition in one number.
- **First bill: 30 September 2027**, not 2026. 2026 only *accrues* at a **2.5%** CBAM factor; the rate climbs to **100% by 2034** as free allocation phases out.
- **Punitive defaults are real and brutal:** country/CN defaults (**Reg. (EU) 2025/2621**) with **10% / 20% / 30%** mark-ups (2026/27/28+). Example: the **Chinese steel-slab default ≈ 3.167 tCO₂e/t** vs a **~1.37 benchmark** — ~2.3× the cost for failing to verify.
- **Buyer-pull adoption:** CDP — suppliers **52% more likely** to cut emissions when buyers ask.
- Steel benchmarks: BF/BOF **1.37**, DRI/EAF **0.481**, scrap-EAF **0.072** tCO₂e/t (handy if a judge probes).

---

## 7. The tough questions — answers that hold up

**"Isn't estimating a supplier's pollution from satellites defamatory / a privacy issue?"**
> We never publish or accuse. The estimate is a **private triage signal for the importer's own sourcing decision** — like running a credit check on a counterparty. It's built on **already-public, independently-published** observation data (Climate TRACE), always shown as a **range + confidence**, never a verdict. And suppliers **opt in by consent** to the Verified Pool, replacing the estimate with their own number. It's defensible because it's true.

**"Is this data actually real, or mocked?"**
> The facility data, owners and LEIs are a **real Climate TRACE extract**, and two feeds (UK grid + GLEIF) are **genuinely live from the browser**. The CBAM policy overlay (self-reports, cert price, CapEx) is illustrative and labelled as such. We deliberately don't fake "live" anything.

**"Can a satellite really pin emissions to one factory?"**
> No — and we don't claim that. Climate TRACE is **satellite + ML at regional resolution**, an independent *estimate*, not a per-facility fingerprint. That's exactly why we present a range + confidence and only ever *recommend verification*.

**"Where do the CapEx / retrofit numbers come from?"**
> Those are **illustrative order-of-magnitude placeholders** to demonstrate the payoff mechanic — labelled "illustrative" on screen. The defensible part is the intensity → cost engine, not the specific € of a hydrogen kiln.

**"What's the moat — can't anyone build a CBAM calculator?"**
> Calculators are table stakes. The moat is the **cross-company Verified Pool**: verified supplier data, contributed once by consent, reused across unaffiliated importers. It compounds with the network and gets harder to replicate as it grows.

---

## 8. Architecture angle (if asked) + the wordplay

- **Serverless by design.** No backend to run or breach: it runs **at the edge — serverless, keyless** — hitting real public feeds (Climate TRACE static extract, GLEIF, the UK grid) **straight from the browser**. Cheap to run, nothing to leak, ships anywhere.
- The name does double duty: **the only thing between a supplier and the EU border is a *bridge*, not a back-office.**
- For a real build (only if pushed): the same frontend + a thin serverless backend (e.g. managed Postgres + Lambda/edge functions) for the shared pool and supplier consent records; the entity-resolution join (trader → producing facility) stays semi-manual with a confidence score, because that's the honest hard part.

---

## 9. Suggested 2–3 minute structure (let Claude refine)

1. **Hook (15s):** CBAM is here; the first bill lands Sept 2027; mid-market importers above the 50-tonne line are exposed and have no compliance team.
2. **Problem (20s):** prove your supplier's carbon or pay punitive defaults — often 2–3× the real cost.
3. **Product (60–75s):** the demo — Overview avoidable-overpayment number → click a supplier to drill the curve → Suppliers triage (private, range+confidence) → Evidence live GLEIF + the Alcoa-vs-Albras grid story.
4. **Moat (20s):** the Verified Pool — verify once by consent, reused across importers; buyer-pull (CDP 52%).
5. **Honesty close (15s):** real data, live feeds, estimates as ranges not accusations — *trust is the product.*
6. **The ask:** what you want from the judges (pilot importers, design-partner suppliers, etc.).

---

## 10. Quick fact sheet (for accuracy under fire)

- CBAM definitive phase began **1 Jan 2026**; 2026 factor **2.5%** (accrues, no payment yet).
- Certificate sales begin **Feb 2027**; **first declaration + surrender due 30 Sep 2027** (covers 2026).
- Free allocation phases out to **100% by 2034**.
- **50 t/yr exemption:** Reg. (EU) 2025/2083 (Omnibus).
- **Punitive defaults:** Reg. (EU) 2025/2621; mark-ups 10/20/30% (2026/27/28+).
- **Aluminium scope:** CBAM prices direct + PFC (~2.5 tCO₂e/t), **not** the ~10–12 cradle-to-gate dominated by electrolysis electricity.
- Data: **Climate TRACE** manufacturing v5.7.0 (CC BY 4.0); live feeds: **UK Carbon Intensity API** + **GLEIF LEI API**.
- 12 facilities on screen = 8 real extract + 4 Americas comparators (illustrative, real identity/LEI).

---

*Built as a frontend-only proof-of-concept. All emissions facility data, owners and LEIs are real (Climate TRACE / GLEIF); the CBAM policy overlay is illustrative and labelled as such.*
