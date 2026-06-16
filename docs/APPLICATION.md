# CarbonBridge — Application Reference (What It Does)

> A detailed walk-through of *what* CarbonBridge is, the problem it solves, the
> domain model, the calculations behind every number, and the regulatory facts
> it is built on. For the visual/UI side, see [`FRONTEND.md`](FRONTEND.md).

---

## 1. One-sentence summary

CarbonBridge is a **CBAM verification, triage, and cost-forecasting workspace**
for a **mid-market EU importer** of steel, aluminium, and cement. It tells that
importer three things: *how much CBAM is going to cost me, how much of that cost
is avoidable, and which suppliers should I chase for verified data first.*

It is a **frontend-only proof-of-concept** (React + Vite + TypeScript). There is
no application backend — and that is a deliberate product decision, not a
shortcut (see §9).

---

## 2. The problem domain: CBAM in plain terms

**CBAM** = the EU's **Carbon Border Adjustment Mechanism**. It's a carbon tariff
on imports of carbon-intensive goods (steel, aluminium, cement, fertiliser,
hydrogen, electricity). The goal is to stop "carbon leakage" — EU producers pay
for their emissions under the EU ETS, so importers must now pay an equivalent
price on the emissions *embedded* in what they bring in.

The cost mechanic, simplified:

```
cost = embedded_emissions × CBAM_factor × certificate_price
embedded_emissions = annual_tonnes_imported × emissions_intensity (tCO₂e per tonne)
```

Three things make this hard for an importer, and CarbonBridge addresses each:

1. **You need an emissions intensity per supplier.** If you can't prove the real
   number, the EU forces you onto a **punitive default value** — deliberately set
   high, with an escalating mark-up, to push you toward getting verified data.
   CarbonBridge quantifies the gap between *default* and *verified* cost — the
   "avoidable overpayment."
2. **You can't verify everyone at once.** A small compliance team has a limited
   budget. CarbonBridge produces a **private triage signal** (the Verification
   Priority Flag) pointing at the suppliers whose self-reported numbers diverge
   most from an independent estimate.
3. **The cost isn't flat — it ramps.** 2026 is nearly free (2.5% factor); the
   first real bill is Sept 2027; full rate hits 2034. CarbonBridge models the
   true trajectory rather than scaring the user with a fake big-today number.

---

## 3. The persona: Meridian Metals BV

Everything is framed around one fictional importer (`src/data/suppliers.ts`):

| Field | Value |
|---|---|
| Name | **Meridian Metals BV** |
| Country | Netherlands |
| EORI | NL812493579 |
| Volume | **> 50 t/year** of steel & aluminium |

The **> 50 tonnes** detail is load-bearing. The EU's **Omnibus simplification
(Reg. (EU) 2025/2083)** introduced a **50-tonne exemption** that removed ~90% of
the smallest importers from CBAM scope. Meridian sits *just above* it: a company
with a real, growing obligation but **no large in-house compliance team** —
exactly the underserved mid-market this product targets.

**How the importer navigates: by material.** An importer thinks in the materials
they declare, so the whole app is organised around a single global **material
lens** (`All / Steel / Aluminium / Cement`). Picking one scopes *every* screen at
once — cost curve, supplier list, triage queue, map, and the Evidence charts —
rather than forcing the user to re-filter on each screen. The product is four
focused screens behind that lens: **Overview** (cost + to-dos + map), **Suppliers**
(verify-first triage + tracker), **Simulator**, and **Evidence** (measured data +
live feeds). See [`FRONTEND.md`](FRONTEND.md) for the UI detail.

---

## 4. The data model

The shared domain types live in [`src/types.ts`](../src/types.ts). The central
entity is the **`Supplier`**, which fuses three layers:

### 4.1 Real measured layer (Climate TRACE)
Sourced from a **static extract of real Climate TRACE data**
(`src/data/history.json`, manufacturing v5.7.0, `co2e_100yr`, CC BY 4.0). For 8
real producing facilities this gives, **genuinely measured**:

- `facilityName`, `country`, `lat`/`lon`
- `productionRoute` (BF-BOF vs EAF — drives the steel benchmark)
- `owner` `{ parent, lei, hq }` — real company + real **LEI**
- `independentEstimate` `{ low, high }` — derived from the real measured
  intensity ± a confidence band
- `estimateConfidence` — Climate TRACE's own confidence flag
- `fullFootprint` — cradle-to-gate intensity incl. purchased electricity
- A **multi-year series** (2021–2025 + partial 2026) of intensity, emissions,
  production

### 4.2 Policy + commercial overlay (illustrative)
Layered on top in the `OVERLAY` map in `suppliers.ts`:

- `selfReported` — the supplier's **self-declared** intensity. **Illustrative** —
  there is no public registry of self-reports, so these are authored to create
  the demo's verification scenarios.
- `countryDefaultValue` — the punitive CBAM default for that country/CN code.
- `benchmark` — EU best-practice intensity for the route.
- `cnCode` — 8-digit CBAM classification code.
- `annualTonnesImported` — Meridian's volume from this supplier.
- `inSharedPool` — whether this supplier's verified data is already contributed
  to the cross-company pool.

### 4.3 Entity-resolution layer (never claimed as automatic)
- `matchConfidence` (low/medium/high) and `matchBasis` (a string explaining the
  match, e.g. *"country + CN code + named installation"*). The product **never**
  asserts an automatic supplier→facility resolution (see §8).

### The supplier book (12 facilities)

The core **8 are a real Climate TRACE extract**. The bottom **4 are Americas
comparators** added so the book isn't skewed to Asia/MENA — they carry a **real
plant, owner and LEI** but **calibrated** emissions (not from the extract), and
are marked `illustrative: true` in the data and **"est."** in the UI (see §9).

| Supplier (owner — plant) | Country | Commodity / Route | Scenario it demonstrates |
|---|---|---|---|
| POSCO — Gwangyang | 🇰🇷 KOR | Steel / BF-BOF | Consistent, verified, in pool |
| Angang | 🇨🇳 CHN | Steel / BF-BOF | **Strong under-report → priority flag** |
| Tata — Jamshedpur | 🇮🇳 IND | Steel / BF-BOF | Borderline under-report |
| MMK — Türkiye | 🇹🇷 TUR | Steel / EAF | Clean scrap/EAF route |
| Körfez Cement | 🇹🇷 TUR | Cement | Big default-vs-actual gap |
| Vissai — Do Luong | 🇻🇳 VNM | Cement | Lower-confidence match |
| EGA — Taweelah | 🇦🇪 ARE | Aluminium | CBAM-scope vs full-footprint story |
| Vedanta — Jharsuguda | 🇮🇳 IND | Aluminium | Verified, in pool |
| Nucor — Berkeley *(est.)* | 🇺🇸 USA | Steel / EAF | Clean US scrap route |
| Alcoa — Warrick *(est.)* | 🇺🇸 USA | Aluminium | Coal grid → **huge** full footprint (~12) |
| Gerdau — Ouro Branco *(est.)* | 🇧🇷 BRA | Steel / BF-BOF | Moderate Americas integrated mill |
| Albras — Barcarena *(est.)* | 🇧🇷 BRA | Aluminium | Hydro grid → **strikingly low** full footprint (~4) |

The two Brazilian/US aluminium rows are deliberately paired: same ~2.5 CBAM-priced
intensity, but **Alcoa's full footprint (~12) vs Albras's (~4)** shows how much of
aluminium's real footprint is grid electricity — coal vs hydro — none of which CBAM
prices.

---

## 5. The calculation engine

All cost math lives in [`src/lib/calc.ts`](../src/lib/calc.ts); the regulatory
constants in [`src/data/cbam.ts`](../src/data/cbam.ts); the triage logic in
[`src/lib/flag.ts`](../src/lib/flag.ts).

### 5.1 The cost formula
```
yearCost(supplier, intensity, year)
  = annualTonnesImported × intensity × phaseFactor(year) × CERT_PRICE_EUR
```
- `CERT_PRICE_EUR = 78` — modelled as a **fixed quarterly-average** cert price
  (the legal number is the Commission's quarterly average, not a live spot).
- `phaseFactor(year)` — the CBAM factor from the phase-in schedule (§6).

### 5.2 Two intensities, two costs
For every supplier, every year, the engine computes **two** costs:

- **`defaultCost`** — what you pay if forced onto the **punitive default value**,
  including the annual mark-up: `countryDefaultValue × (1 + markup(year))`.
- **`verifiedCost`** — what you pay using **verified actual** data. The
  `verifiedIntensity` rule is deliberately conservative:
  - if the supplier is **in the shared pool**: use `min(selfReported, estimate
    midpoint)` (you can bank the lower verified number);
  - otherwise: use the **independent estimate midpoint** (you *cannot* bank an
    unverified self-report).

- **`avoidable` = defaultCost − verifiedCost** → the headline **"avoidable
  overpayment."** This is the core value proposition number.

### 5.3 The Verification Priority Flag (triage)
In `flag.ts`, `evaluateFlag(supplier, threshold)`:

```
divergence = (estimateMidpoint − selfReported) / estimateMidpoint
flagged = confidentEnough         // estimateConfidence is NOT 'low'
        && clearlyBelowRange      // selfReported < estimate.low
        && divergence > threshold // default threshold = 0.20 (20%)
```
- **Severity**: `priority` if divergence > max(0.33, threshold×1.5), else
  `watch`.
- **Guard rail**: a **low-confidence** estimate can *never* trigger a flag —
  those suppliers are labelled "can't assess / unverified," never "implausible."
- The reason string is always phrased as *"diverges from the independent
  estimate — recommend verification. Not an accusation."*

The threshold is **user-tunable** via a slider on the Suppliers page (where the
triage queue lives), so the flag count recomputes live.

---

## 6. The CBAM timeline (modelled accurately)

From `PHASE_IN` in `cbam.ts`. This is the honest cost story — *"accruing now,
first bill September 2027, climbing steeply through 2034"* — **not** "you're
hemorrhaging money today."

| Year | CBAM factor | Status | What happens |
|---|---|---|---|
| **2026** | 2.5% | accruing | Definitive phase begins. Liability **accrues**; no payment yet. |
| **2027** | 5% | first-payment | **First declaration + certificate surrender due 30 Sep 2027** (covers 2026). Cert sales open Feb 2027. |
| 2028 | 10% | scaling | Free allocation continues to phase out. |
| 2029 | 22.5% | scaling | |
| 2030 | 48.5% | scaling | |
| 2031 | 61% | scaling | |
| 2032 | 73.5% | scaling | |
| 2033 | 86% | scaling | |
| **2034** | 100% | scaling | Free allocation fully gone — CBAM at full rate. |

**Default-value mark-up** (`defaultMarkup`, Reg. (EU) 2025/2621): **10%** (2026),
**20%** (2027), **30%** (2028+). This escalating penalty is what makes defaults
"double or triple" real costs over time and grows the avoidable slice.

**Modelling note (important for rigor):** free allocation is modelled **via the
CBAM phase-in factor only** — the engine does **not** *also* subtract the EU-ETS
benchmark, because that would **double-count** the free-allocation reduction. The
benchmark is shown as best-practice context and drives map/shelf colouring, not
the price.

---

## 7. Regulatory grounding (the facts it's built on)

These are real and chosen so the demo survives a policy-literate audience:

- **First payment is September 2027, not 2026.** 2026 only accrues.
- **2026 applies a 2.5% factor** → small near-term net cost; gap widens to 2034.
- **50 t/year exemption** — **Reg. (EU) 2025/2083** (Omnibus) — defines the
  mid-market target customer.
- **Punitive defaults are real** — country/CN default values published **Dec
  2025** (**Reg. (EU) 2025/2621**), with **10/20/30%** mark-ups. Example: the
  **Chinese steel-slab default ≈ 3.167 tCO₂e/t** vs a **~1.37 benchmark** — the
  engine behind the "avoidable overpayment."
- **Steel benchmarks**: BF/BOF **1.37**, DRI/EAF **0.481**, scrap EAF **0.072**.
- **Aluminium scope**: CBAM prices **direct + PFC** emissions only (~2.5
  tCO₂e/t), **not** the ~10–12 tCO₂e/t cradle-to-gate dominated by electrolysis
  electricity. The app surfaces both and prices only the in-scope figure.

---

## 8. The honest-uncertainty stance (the product's spine)

This is the most important design principle and it is enforced in code, not just
copy. The underlying independent data is **modelled**, not litigation-grade:

- A peer-reviewed study (**Gurney et al., 2024, *Environmental Research
  Letters***) found Climate TRACE power-plant CO₂ estimates averaged **~50%
  lower** than an established inventory.
- **Copernicus's own methane explorer** states satellite resolution *"does not
  allow the identification of specific facilities as the source of the
  emissions."*

Consequences baked into the product:

1. **Estimates are ALWAYS a range + confidence**, never a single hard number —
   enforced through a single shared `RangeBadge` primitive so no view can bypass
   it.
2. **The flag is a private triage signal**, visible only in the importer's own
   view. It **never** labels a supplier "false" or "greenwashing"; it says
   "diverges — recommend verification."
3. **Entity resolution is never automatic.** Climate TRACE assets carry **no
   LEI**, so there's no shared key between the importer's named supplier (often a
   *trader/distributor*, not the mill) and the facility dataset. Every match
   carries a confidence score and a **manual-confirm** step; the product keeps
   **both** the estimate and the self-report rather than asserting one truth.

---

## 9. What's real vs mock

| Layer | Status |
|---|---|
| The **8 core** supplier facilities — owners, **LEIs**, locations, routes, multi-year intensity, scope-vs-full-footprint | **REAL** (Climate TRACE static extract, CC BY 4.0) |
| The **4 Americas comparators** (Nucor, Alcoa, Gerdau, Albras) | **Real identity** — real plant, owner & **verified LEI** (pulled live from GLEIF) — with **calibrated** emissions; marked `illustrative` / **"est."** Not from the CT extract. |
| **UK Carbon Intensity API** (live GB grid intensity + generation mix) | **REAL & LIVE** (no key, CORS-enabled, in browser) |
| **GLEIF LEI API** (company-identity lookup + match score) | **REAL & LIVE** (no key, CORS-enabled, in browser) |
| Supplier **self-reported** figures | Illustrative (no public registry exists) |
| CBAM **default values** / cert price | Anchored to published numbers where available |
| CBAM Copilot | Optional — a **real Bedrock Lambda** exists in `infra/`; the UI degrades gracefully if `VITE_COPILOT_URL` is unset |

**Why frontend-only is deliberate:** going backend-free sidesteps the two hardest
real-world problems — *entity resolution* (trader→facility) and *data-pipeline
plumbing* — so the POC can focus on telling the product story clearly. The two
live APIs prove the pipeline is real, not hand-waved.

---

## 10. The strategic thesis (the "moat")

From [`SPEC.md`](SPEC.md). The novelty is the **data-ownership model**, not the
feature list:

1. **A cross-company shared pool.** One supplier's verified data is reused across
   *unaffiliated* importers (`inSharedPool` + a deterministic "verified by N
   importers" count), rather than re-collected inside every buyer's account.
2. **The independent estimate as a cold-start / triage layer.** Before the pool
   has depth, the estimate already gives a single importer something useful: where
   to focus scrutiny on day one.

**Why suppliers participate — buyer-pull, evidenced:** CDP's 2024 supply-chain
data found suppliers were **52% more likely to cut emissions when buyers offered
incentives**, and buyer engagement drove **43 Mt of reductions** (more than
Sweden's annual emissions). Supplier comparison, cost forecasting, and automated
reminders are treated as **table-stakes**, not the differentiator.

---

## 11. Optional Copilot backend (`infra/`)

A genuinely deployable extra, not used unless wired:

- [`infra/lambda/copilot.mjs`](../infra/lambda/copilot.mjs) — an AWS Lambda
  (Function URL + CORS) that calls **Claude on Amazon Bedrock** via the Converse
  API. Default model `anthropic.claude-sonnet-4-6`; configurable to Haiku (cheaper)
  or Opus (max quality).
- Its system prompt hard-codes the same honesty ground rules (Sept-2027 first
  payment, ranges-not-verdicts, aluminium scope, benchmarks, no invented
  numbers).
- The frontend `Copilot` widget points at `VITE_COPILOT_URL`; with no endpoint it
  shows a graceful "not wired" state and the rest of the app is unaffected.
- `infra/template.yaml` is a SAM template for one-command deploy (see
  `docs/AWS_DEPLOY.md`).

---

## 12. Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm run preview  # serve the production build
```

All figures are **illustrative mock values calibrated to published orders of
magnitude** except the real layers in §9. The reference for where real production
data would come from is in [`MOCK_DATA.md`](MOCK_DATA.md).
