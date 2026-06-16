import { useMemo, useState } from 'react'
import { SUPPLIERS } from '../data/suppliers'
import { CERT_PRICE_EUR } from '../data/cbam'
import {
  forecast,
  verifiedIntensity,
  supplierYearCost,
  EUR,
  NUM,
} from '../lib/calc'
import { scaleLinear } from 'd3-scale'
import { byMaterial, MATERIALS } from '../lib/material'
import { useAppState, useMode } from '../state/appState'
import { Card, SectionTitle, Pill, FlagEmoji, PitchNote } from '../components/ui'

const SIM_YEAR = 2030

// Baseline (sourced) intensity for every supplier — the slider's starting point.
const BASELINE: Record<string, number> = Object.fromEntries(
  SUPPLIERS.map((s) => [s.id, verifiedIntensity(s)]),
)

// Carbon cost per tonne at baseline, and the baseline shelf order, so the live
// shelf can show where each supplier STARTED and how far it has climbed.
const BASELINE_PER_TONNE: Record<string, number> = Object.fromEntries(
  SUPPLIERS.map((s) => [s.id, BASELINE[s.id] * CERT_PRICE_EUR]),
)
// Colour by how far above its commodity benchmark a supplier runs (green→red),
// so the shelf reads as "who's clean vs dirty" even before you touch a slider.
const shelfColor = scaleLinear<string>()
  .domain([1, 1.6, 2.4])
  .range(['#34d399', '#f59e0b', '#f87171'])
  .clamp(true)

export default function Simulator() {
  const { material } = useAppState()
  const mode = useMode()
  const SUPS = byMaterial(SUPPLIERS, material)
  const materialLabel = MATERIALS.find((m) => m.id === material)!.label

  // One independent what-if intensity per supplier — every company is editable.
  const [overrides, setOverrides] = useState<Record<string, number>>({ ...BASELINE })

  const setOne = (id: string, v: number) =>
    setOverrides((o) => ({ ...o, [id]: v }))
  const resetAll = () =>
    setOverrides((o) => ({ ...o, ...Object.fromEntries(SUPS.map((s) => [s.id, BASELINE[s.id]])) }))

  const agg = useMemo(() => {
    const baseRows = forecast(SUPS)
    const simRows = forecast(SUPS, overrides)
    const cumSaved = baseRows.reduce(
      (a, r, i) => a + (r.verifiedCost - simRows[i].verifiedCost),
      0,
    )
    let yearSaved = 0
    let co2Cut = 0
    let improved = 0
    for (const s of SUPS) {
      const cur = overrides[s.id]
      yearSaved +=
        supplierYearCost(s, SIM_YEAR).verifiedCost -
        supplierYearCost(s, SIM_YEAR, cur).verifiedCost
      co2Cut += (BASELINE[s.id] - cur) * s.annualTonnesImported
      if (cur < BASELINE[s.id] - 1e-9) improved++
    }

    // Live ranking by carbon cost per tonne (cheapest = best), using overrides.
    const ranked = [...SUPS]
      .map((s) => ({ s, perTonne: overrides[s.id] * CERT_PRICE_EUR }))
      .sort((a, b) => a.perTonne - b.perTonne)
    const rankOf: Record<string, number> = {}
    ranked.forEach((r, i) => (rankOf[r.s.id] = i + 1))

    // Baseline rank + shelf scale, both scoped to the active material set.
    const baselineRankOf: Record<string, number> = {}
    ;[...SUPS]
      .sort((a, b) => BASELINE[a.id] - BASELINE[b.id])
      .forEach((s, i) => (baselineRankOf[s.id] = i + 1))
    const shelfMax = Math.max(...SUPS.map((s) => BASELINE_PER_TONNE[s.id]), 1)

    return { cumSaved, yearSaved, co2Cut, improved, ranked, rankOf, baselineRankOf, shelfMax }
  }, [overrides, SUPS])

  return (
    <div className="space-y-5">
      <SectionTitle
        kicker="Green-payoff simulator"
        title={material === 'all' ? 'What if your suppliers decarbonised?' : `What if your ${materialLabel.toLowerCase()} suppliers decarbonised?`}
        sub="Drag any supplier's slider on the left — the ledger and live shelf on the right update in tandem, no scrolling."
        right={
          <button
            onClick={resetAll}
            className="rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-mute hover:text-text"
          >
            ↺ Reset all
          </button>
        }
      />

      {mode === 'pitch' && (
        <PitchNote title="What the sliders model (and what's held fixed)">
          Each slider's <strong>starting point is that supplier's real sourced intensity</strong> (Climate TRACE,
          held constant — no decarbonisation assumed). Dragging it down recomputes cost as{' '}
          <strong>intensity × volume × CBAM factor × cert price</strong> across 2026–2034, using the same
          legislated phase-in as the Overview. Floor = the commodity benchmark; ceiling = the independent
          estimate's high. CO₂ cut is the intensity delta × annual tonnes — a what-if, not a commitment.
        </PitchNote>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT — compact slider per supplier */}
        <div className="space-y-3 lg:col-span-5">
          {SUPS.map((s) => {
            const baseline = BASELINE[s.id]
            const cur = overrides[s.id]
            const floor = +s.benchmark.toFixed(2)
            const ceil = +s.independentEstimate.high.toFixed(2)
            const improved = cur < baseline - 1e-9
            const pctCut = Math.round(((baseline - cur) / baseline) * 100)
            const yearSaved =
              supplierYearCost(s, SIM_YEAR).verifiedCost -
              supplierYearCost(s, SIM_YEAR, cur).verifiedCost

            return (
              <Card key={s.id} className="!p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FlagEmoji code={s.countryCode} />
                    <span className="truncate text-sm font-semibold text-text">{s.name}</span>
                    {s.inSharedPool && <Pill tone="pool">◇</Pill>}
                  </div>
                  <span className="shrink-0 text-[11px] text-mute">
                    rank <span className="stat-num text-sm font-semibold text-text">#{agg.rankOf[s.id]}</span>
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-3">
                  <input
                    type="range"
                    min={floor}
                    max={ceil}
                    step={0.01}
                    value={cur}
                    onChange={(e) => setOne(s.id, +e.target.value)}
                    className="min-w-0 flex-1 accent-brand"
                  />
                  <span className="stat-num w-24 shrink-0 text-right text-base font-semibold text-brand">
                    {NUM(cur, 2)}
                    <span className="text-[10px] font-normal text-mute"> tCO₂/t</span>
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-mute">
                  <span>
                    {s.commodity}
                    {s.productionRoute !== 'n/a' ? ` · ${s.productionRoute}` : ''} · bench {NUM(floor, 2)}
                  </span>
                  {improved ? (
                    <span className="text-brand">
                      ↓{pctCut}% · {EUR(Math.max(0, yearSaved))} saved
                    </span>
                  ) : (
                    <span>at sourced baseline</span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        {/* RIGHT — sticky ledger + live shelf, always in view */}
        <div className="lg:col-span-7">
          <div className="space-y-4 lg:sticky lg:top-6">
            {/* Aggregate impact ledger */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LedgerStat label={`Saved ${SIM_YEAR}`} value={EUR(Math.max(0, agg.yearSaved))} tone="brand" />
              <LedgerStat label="Cumul. 26–34" value={EUR(Math.max(0, agg.cumSaved))} tone="brand" />
              <LedgerStat label="CO₂ cut/yr" value={`${NUM(Math.max(0, agg.co2Cut))} t`} tone="accent" />
              <LedgerStat
                label="Improved"
                value={`${agg.improved}/${SUPS.length}`}
                tone="text"
              />
            </div>

            {/* Live shelf */}
            <Card>
              <SectionTitle
                title="Live shelf — lower carbon cost per tonne ranks higher"
                sub="Bar = carbon cost/tonne; colour = intensity vs benchmark (green→red). Drag a slider and watch a supplier shrink, green-up, and climb past its start mark (◁)."
                right={
                  <div className="flex items-center gap-2 text-[11px] text-mute">
                    <span className="inline-block h-2 w-12 rounded-sm" style={{ background: 'linear-gradient(90deg,#34d399,#f59e0b,#f87171)' }} />
                    <span>clean → dirty</span>
                  </div>
                }
              />
              <div className="space-y-1">
                {agg.ranked.map(({ s, perTonne }, i) => {
            const moved = overrides[s.id] < BASELINE[s.id] - 1e-9
            const max = agg.shelfMax
            const delta = agg.baselineRankOf[s.id] - (i + 1) // >0 = climbed up
            const color = shelfColor(overrides[s.id] / s.benchmark)
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
                  moved ? 'bg-brand/[0.07]' : 'hover:bg-panel2/60'
                }`}
              >
                <span className="stat-num w-6 text-sm font-semibold text-text">{i + 1}</span>
                {/* rank movement */}
                <span className="w-8 text-center text-xs">
                  {delta > 0 ? (
                    <span className="text-brand">▲{delta}</span>
                  ) : (
                    <span className="text-mute/50">–</span>
                  )}
                </span>
                <FlagEmoji code={s.countryCode} />
                <span className="w-48 truncate text-sm text-text">{s.name}</span>

                {/* track with baseline ghost marker + live bar */}
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-panel2">
                  {/* baseline ghost position */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-text/40"
                    style={{ left: `calc(${(BASELINE_PER_TONNE[s.id] / max) * 100}% - 1px)` }}
                    title={`Baseline ${EUR(BASELINE_PER_TONNE[s.id], 0)}/t`}
                  />
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${(perTonne / max) * 100}%`,
                      backgroundColor: color,
                      opacity: moved ? 1 : 0.85,
                    }}
                  />
                </div>

                <span className="stat-num w-20 text-right text-sm font-medium text-text">
                  {EUR(perTonne, 0)}
                  <span className="text-mute">/t</span>
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 border-t border-edge pt-3 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-text/40" /> ◁ where it started
            (baseline)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-brand">▲</span> places climbed since baseline
          </span>
        </div>
            </Card>
          </div>
        </div>
      </div>

      <p className="text-xs text-mute">
        Each slider is a what-if; its starting point is that supplier's sourced
        independent estimate (real Climate TRACE intensity). CBAM factor and cert
        price per <code className="text-mute">src/data/cbam.ts</code>.
      </p>
    </div>
  )
}

function LedgerStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'brand' | 'accent' | 'text'
}) {
  const c = { brand: 'text-brand', accent: 'text-accent', text: 'text-text' }[tone]
  return (
    <div className="card bg-gradient-to-br from-panel to-panel2 p-3">
      <div className="text-[11px] text-mute">{label}</div>
      <div className={`stat-num mt-0.5 text-lg font-bold ${c}`}>{value}</div>
    </div>
  )
}
