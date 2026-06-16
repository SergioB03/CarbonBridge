# CarbonBridge — Frontend Guide (How the UI Works & What It Represents)

> A detailed map of the front end: the stack, the shell, shared state, the design
> system, and a screen-by-screen tour of what every view shows and *why it's
> there*. For the domain logic and data model behind the numbers, see
> [`APPLICATION.md`](APPLICATION.md).

---

## 1. Stack & build

| Concern | Choice |
|---|---|
| Framework | **React 18** (function components + hooks only) |
| Language | **TypeScript** |
| Bundler / dev server | **Vite 5** |
| Styling | **Tailwind CSS 3** (utility classes + a tiny `@layer components` set) |
| Charts | **Recharts** (area, bar, composed) |
| Maps | **react-simple-maps** + **d3-scale** (colour/size scales) |
| State | React Context + `useState` — **no Redux, no router library** |

There is **no client-side router**. "Navigation" is a single piece of state
(`view`) that swaps which component renders. The whole app is a single SPA screen
with a persistent sidebar.

Entry points: `index.html` → `src/main.tsx` (wraps `<App/>` in
`<AppStateProvider>`) → `src/App.tsx` (the shell).

---

## 2. The app shell — `src/App.tsx`

A fixed two-part layout:

```
┌──────────────┬─────────────────────────────────────────────┐
│  SIDEBAR     │  MAIN (max-w-1180px, centred)                │
│  (sticky,    │                                              │
│   w-64)      │   <Active />  ← the current view component   │
│              │                                              │
│  • logo      │                                              │
│  • MATERIAL  │  ← All / Steel / Aluminium / Cement          │
│    switcher  │                                              │
│  • 4 nav     │                                              │
│    buttons   │                                              │
│  • view-mode │                                              │
│    toggle    │                                              │
│  • importer  │                                              │
│    footer    │                              ✦ Copilot (FAB) │
└──────────────┴─────────────────────────────────────────────┘
```

- **`NAV`** is an array of **4** entries (id, label, icon, hint) — Overview,
  Suppliers, Simulator, Evidence. Clicking a button calls `setView(id)`.
- **`VIEWS`** is a `Record<string, Component>` map. `App` looks up
  `VIEWS[view]` and renders it as `<Active/>`. That's the entire routing system.
- The **material switcher** sits at the top of the sidebar (above nav) and sets
  the global `material` lens — see §3.1. It is the importer's *primary* way to
  navigate: scope first to a material, then move between screens.
- The **`Copilot`** chat widget is rendered once, outside the view area, so it
  floats over every screen.

### The view-mode toggle (Operator vs Pitch)
A two-button switch at the bottom of the sidebar sets `mode`:

- **`operator`** — the clean importer's working app. Methodology/“why this
  matters” copy is hidden.
- **`pitch`** (labelled *"Pitch / judge"*) — reveals the extra framing blocks:
  data provenance, methodology notes, uncertainty caveats. Used when presenting
  to a technical/judging audience.

In `pitch` mode **every** screen renders a prominent **`PitchNote`** callout at
the top (right under the header) — a labelled "◉ Pitch / judge view" block with
that screen's methodology, sources and framing. So flipping the toggle produces
an immediate, above-the-fold change on whatever view you're on. It changes
**copy/annotations only**, never the numbers.

---

## 3. Shared state — `src/state/appState.tsx`

A single React Context (`AppStateProvider` / `useAppState`) holds everything that
must be shared across views. There's no external store.

| State | Type | Purpose |
|---|---|---|
| `mode` | `'operator' \| 'pitch'` | The view-mode toggle above. |
| `material` | `'all' \| 'steel' \| 'aluminium' \| 'cement'` | The global material lens (§3.1). Scopes every screen at once. |
| `view` | `string` | Which screen is active (the "router"). Defaults to `'overview'`. |
| `verifyStatus` | `Record<id, 'none' \| 'requested' \| 'received'>` | The per-supplier verification workflow. |

The verification actions — `requestVerification(id)`, `markReceived(id)`,
`resetVerification()` — are the key bit: they're shared, so requesting verified
data on the **Overview** worklist or the **Suppliers** page stays in sync
instantly. (State is in-memory only; a real deployment would persist it and email
the supplier.)

### 3.1 The material lens — `src/lib/material.ts`
An importer thinks in the materials they actually declare, so **material is the
app's primary axis of navigation**, not a per-screen afterthought.

- `material` lives in shared state; the sidebar switcher (`All / Steel /
  Aluminium / Cement`) sets it.
- Every view filters its data through one of two tiny helpers:
  - **`byMaterial(suppliers, material)`** — for anything keyed off `SUPPLIERS`
    (Overview, Suppliers, Simulator, the map, ProvenanceCard). Filters on
    `supplier.commodity`.
  - **`facilitiesByMaterial(facilities, material)`** — for Evidence, which reads
    raw Climate TRACE facilities that carry a `subsector` string (`iron-and-steel`
    / `aluminum` / `cement`) instead of a `commodity`. `SUBSECTOR_FOR` maps
    between them.
- Because the filter is global, picking "Aluminium" reshapes the cost curve, the
  supplier list, the priority queue, the map dots, and the Evidence charts all at
  once — one mental model, persisted as you move between screens.

---

## 4. Design system

### Palette — `tailwind.config.js`
Deep-slate dark theme with signal colours that carry **consistent meaning**:

| Token | Hex | Meaning |
|---|---|---|
| `ink` / `panel` / `panel2` | `#0b1220` / `#121a2b` / `#1a2438` | Backgrounds (deepest → cards → insets) |
| `edge` | `#243049` | Borders |
| `text` / `mute` | `#e6ecf7` / `#7d8aa5` | Primary / secondary text |
| **`brand`** | `#34d399` (green) | **verified / good / clean** |
| **`warn`** | `#f59e0b` (amber) | **verification-priority** |
| **`danger`** | `#f87171` (red) | **high divergence / dirty / avoidable cost** |
| **`accent`** | `#60a5fa` (blue) | **network / info / the shared pool** |

This colour grammar is consistent everywhere: green = good/verified, amber =
needs-attention/triage, red = cost-you-can-avoid/dirty, blue = network/pool.

### `index.css`
Three component classes (`.card`, `.chip`, `.stat-num`), thin scrollbars for
projector legibility, and two faint radial-gradient glows on the body background.
`.stat-num` applies a **mono, tabular-nums** font so figures don't jitter when
they animate.

### Shared primitives — `src/components/ui.tsx`
Views are composed almost entirely from these, which keeps the look consistent
and — crucially — makes the legally-important affordances impossible to bypass:

- **`Card`**, **`SectionTitle`** (kicker + title + sub + right slot), **`Stat`**
  (big KPI tile with a tone colour), **`Pill`** (small status chip), **`FlagEmoji`**
  (ISO-2 → flag emoji).
- **`RangeBadge`** — **the single most important component in the product.** It
  renders an independent estimate as `low–high tCO₂/t` + a `ConfidenceChip`.
  Because every view shows estimates *through this one component*, the rule
  "never a single hard number" can't be violated in one screen by accident.
- **`ConfidenceChip`** — low/medium/high, colour-coded.
- **`VerifyBadge`** — the amber "⚑ Verification Priority/Watch" triage badge. Its
  tooltip explicitly states *"private triage signal — not a public claim,"*
  hard-wiring the framing into the UI.
- **`PitchNote`** — the accent-bordered "◉ Pitch / judge view" callout shown at the
  top of each screen when `mode === 'pitch'` (§2). One component, used by all four
  views, so the judge-facing framing looks and reads consistently everywhere.

---

## 5. Screen-by-screen tour

There are **4 views** (plus the floating Copilot), each one file in
`src/views/`. The app was deliberately consolidated from an earlier 8-screen
layout where Home/Cost/Verification/Map/Live-data overlapped — collapsing those
into four screens organised around the importer's actual workflow. Every view is
scoped by the global **material lens** (§3.1).

### 5.1 Overview — `Overview.tsx` · *"Cost, to-dos & where it sits"*
The landing page and command centre. It merges what used to be three separate
screens (Home worklist + Cost & forecast + Facility map). Top to bottom:

1. **4 KPI tiles** — days until the **30 Sep 2027** declaration (live countdown),
   2026 accruing liability, cumulative avoidable 2026–2034, and a count of
   suppliers needing action.
2. **"Needs your attention" queue** — ranks every non-pool, unreceived supplier
   into `verify` (flagged, rank 0) / `request` (no verified data, rank 1) /
   `awaiting` (rank 2), each with a **"Request verified data"** button driving the
   shared `verifyStatus`. Links across to the Suppliers page.
3. **CBAM timeline** — three phase cards (2026 accruing / 30 Sep 2027 first
   payment / 2034 full rate), colour-graded accent→amber→red.
4. **Cost-trajectory area chart (Recharts)** — red `defaultCost` vs green
   `verifiedCost`, 2026–2034. A **year selector** (2026/2027/2030/2034) drops a
   dashed `ReferenceLine` **and** drives the breakdown below — shared year context.
5. **Per-supplier breakdown** for the selected year — ranked bars split green
   (verified, unavoidable) + red (avoidable overpayment), each with a `RangeBadge`.
6. **`<FacilityMap/>`** — the world map, folded in (see §5.5).
7. **`<ProvenanceCard/>`** — measured→projected blend (see §6).
8. In **pitch** mode: a provenance/methodology footnote.

**Represents:** the single place an importer lands — *"what do I owe, what's
avoidable, what needs doing, and where does it physically sit."*

### 5.2 Suppliers — `Suppliers.tsx` · *"Verify first & track requests"*
Merges the old standalone **Verification priority** triage *into* the supplier
tracker, so triage and the workflow live on one screen. Top to bottom:

- A **🔒 "Private — importer view only"** framing card with the **sensitivity
  slider** (5%–40%) that tunes the divergence threshold live.
- **"⚑ Verify first" priority queue** — cards for flagged suppliers with no
  request out, each showing a **`DivergenceBar`** (independent estimate as a band,
  self-report as a marker, the **flag gate** as a moving line), the reason string,
  and a request button.
- **Full tracker table** — every supplier bucketed by **stage** (`flagged →
  unverified → requested → received → pool`, via the `ORDER` map), with product ·
  CN, a `RangeBadge`, a status pill, and a context-aware action button (**Request
  data** → **Mark received** → —). Pool rows show *"verified by N importers"*.

**Represents:** *where to spend a limited verification budget* and the
request→receive lifecycle — with the deliberate restraint (ranges, confidence
gating, "recommend verification" never "false") that keeps the flag defensible.

### 5.3 Simulator — `Simulator.tsx` · *"What-if decarbonisation payoff"*
A two-column what-if model (fixed at sim year **2030**).

- **Left:** one **slider per supplier** (only the active material's suppliers),
  from its commodity benchmark (floor) to its independent-estimate high (ceiling),
  with live % cut and € saved.
- **Right (sticky):** an **impact ledger** (saved 2030, cumulative 26–34, CO₂
  cut/yr, # improved) over a **live shelf** ranked by carbon-cost-per-tonne. Bars
  coloured green→amber→red by intensity-vs-benchmark (`d3-scale`), with a **ghost
  marker** for the baseline and **▲N** when a supplier climbs vs its start. The
  baseline rank and shelf scale are computed *within* the active material set.

**Represents:** the payoff of supplier decarbonisation — drag a slider, watch a
supplier shrink, green-up, and climb.

### 5.4 Evidence — `Evidence.tsx` · *"Real measured data & live feeds"*
The ground-truth screen — *"before any forecast, here's what's real"* — now also
absorbing the old **Live data** view as a closing "and it's wired to real feeds"
section. Marked with a **● real data** pill.

- **4 provenance stats** (named facilities, years measured, CO₂e measured 2025,
  cumulative 21–25) — all material-scoped.
- **Chart 1** — real measured **emissions/production by year** (2021–2025),
  stacked by commodity, with an emissions↔production toggle.
- **Chart 2** — **CBAM-scope vs out-of-scope** footprint per facility (horizontal
  stacked bars): green = CBAM-priced, grey = cradle-to-gate remainder.
- **Facility provenance table** — route, CBAM intensity, full intensity, **owner +
  real LEI**, confidence. *"Every row is auditable."*
- **Live feeds** (`GridPanel` + `LeiPanel`, imported from `LiveData.tsx`) — two
  **live public APIs** hit from the browser (no key, CORS-enabled):
  - **UK Carbon Intensity API** → live GB grid intensity + generation mix + clean
    share. Honest caption: GB grid ≠ a Chinese smelter's grid.
  - **GLEIF LEI API** → real LEI records scored by token-overlap similarity
    (`nameSimilarity`). Honest caption: Climate TRACE assets carry **no LEI**, so
    the facility join stays semi-manual. Both degrade gracefully on fetch failure.

**Represents:** the defensible measured foundation everything stands on — *and*
proof the data pipeline is real, not hand-waved.

### 5.5 `FacilityMap` (embedded) — `src/views/FacilityMap.tsx`
No longer a standalone nav item — it renders **inside the Overview**. A world map
(`react-simple-maps`, equal-earth, GeoJSON in `public/countries-110m.json`)
alongside a **synced facility list**:

- One dot per supplier (filtered by material): **colour** = intensity-vs-benchmark
  (green→red `d3-scale`), **size** = tonnes imported, **dashed amber ring** =
  carries a verification-priority flag.
- **Clustering is handled** three ways: the active dot is always drawn **last** (on
  top, never occluded); the invisible click hit-area is kept small (`r+3`) so it
  doesn't swallow neighbouring dots; and a **scrollable list beside the map** lets
  you hover/click any facility by name — the reliable way to reach overlapping
  dots. Hover and pin state (`hover` / `pinned`) are shared between the map and the
  list, so highlighting one highlights the other.
- Hover or click-to-pin reveals a detail panel (estimate range, self-report,
  benchmark, import volume, match confidence + basis).

**Represents:** where the carbon *and* the commercial demand sit, geographically —
now spanning Asia, MENA **and the Americas** (US + Brazil comparators).

---

## 6. `ProvenanceCard` — `src/components/ProvenanceCard.tsx`

Embedded inside the **Overview**. A **`ComposedChart`** plotting **two real
measured signals** for one supplier, because the CBAM-priced intensity is a
*constant* emissions factor in Climate TRACE (flat on its own), while the full
footprint actually moves:

- **Full cradle-to-gate footprint** (solid green, `fullIntensity`) — the real
  year-to-year movement, driven mostly by the supplier's grid electricity. For
  the aluminium smelters this shows a genuine downward decarbonisation trend.
- **CBAM-priced slice** (solid blue, `intensity`) — the flatter factor we actually
  price and project.
- Each line continues past the last observed year as a **dashed, held-constant**
  path to 2034 (**not a forecast**), with a **confidence band** (the supplier's own
  Climate TRACE confidence) around the full line.
- A **"CBAM begins" 2026** reference line, and a supplier `<select>` whose options
  are limited to the **active material**.
- Cement facilities carry no electricity layer (`fullIntensity` is null), so the
  two lines coincide and the legend says so — honestly flat, not faked.

Below it, two tiles contrast **CBAM-scope intensity (priced)** vs **full
cradle-to-gate footprint**, with the *"only ~N% is CBAM-priced"* line — the
aluminium scope story made concrete, and now visible in the chart itself.

**Represents:** the honest "blend" — real measured history (that genuinely moves),
deterministic forward — and a hook into the Simulator (*"drag it down"*).

---

## 7. Copilot — `src/components/Copilot.tsx`

A floating chat FAB (bottom-right, on every screen).

- Posts the message history to `VITE_COPILOT_URL` (the Bedrock Lambda in
  `infra/`).
- **Degrades gracefully**: with no endpoint configured it shows a "not wired"
  chip and an explanatory reply, so the demo UI always works.
- A status chip shows **● Bedrock** (wired) or **○ not wired**.

**Represents:** an optional AI assistant grounded in the same CBAM honesty rules
— present in the UI, real backend available, never required.

---

## 8. How a change flows through the UI (mental model)

1. **Data** (`src/data/*`) is static at import time — `SUPPLIERS` is built once
   from `history.json` + the overlay.
2. **The material lens filters first.** Each view runs the full list through
   `byMaterial(...)` / `facilitiesByMaterial(...)` before anything else, so the
   active material reshapes every downstream number.
3. **Pure functions** (`src/lib/*`) turn that filtered data + inputs (year,
   threshold, slider overrides) into numbers. No side effects.
4. **Views** call those functions inside `useMemo`/render and paint them with
   shared **`ui.tsx`** primitives.
5. **Shared state** (`appState`) is the only thing that crosses view boundaries:
   `material` (the global lens), `view` (navigation), `mode` (operator/pitch
   copy), and `verifyStatus` (the request workflow). Change one and every
   dependent view re-renders in sync.

That's the whole front end: static real data → material filter → pure calc →
consistent primitives → a thin shared-state layer that keeps the lens and the
triage workflow coherent across all four screens.
