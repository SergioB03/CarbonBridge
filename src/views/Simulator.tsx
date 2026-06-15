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
import { Card, SectionTitle, Pill, RangeBadge, FlagEmoji } from '../components/ui'

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
const BASELINE_RANK: Record<string, number> = (() => {
  const order = [...SUPPLIERS].sort((a, b) => BASELINE[a.id] - BASELINE[b.id])
  const m: Record<string, number> = {}
  order.forEach((s, i) => (m[s.id] = i + 1))
  return m
})()

// Colour by how far above its commodity benchmark a supplier runs (green→red),
// so the shelf reads as "who's clean vs dirty" even before you touch a slider.
const shelfColor = scaleLinear<string>()
  .domain([1, 1.6, 2.4])
  .range(['#34d399', '#f59e0b', '#f87171'])
  .clamp(true)

export default function Simulator() {
  // One independent what-if intensity per supplier — every company is editable.
  const [overrides, setOverrides] = useState<Record<string, number>>({ ...BASELINE })

  const setOne = (id: string, v: number) =>
    setOverrides((o) => ({ ...o, [id]: v }))
  const resetAll = () => setOverrides({ ...BASELINE })

  const agg = useMemo(() => {
    const baseRows = forecast(SUPPLIERS)
    const simRows = forecast(SUPPLIERS, overrides)
    const cumSaved = baseRows.reduce(
      (a, r, i) => a + (r.verifiedCost - simRows[i].verifiedCost),
      0,
    )
    let yearSaved = 0
    let co2Cut = 0
    let improved = 0
    for (const s of SUPPLIERS) {
      const cur = overrides[s.id]
      yearSaved +=
        supplierYearCost(s, SIM_YEAR).verifiedCost -
        supplierYearCost(s, SIM_YEAR, cur).verifiedCost
      co2Cut += (BASELINE[s.id] - cur) * s.annualTonnesImported
      if (cur < BASELINE[s.id] - 1e-9) improved++
    }

    // Live ranking by carbon cost per tonne (cheapest = best), using overrides.
    const ranked = [...SUPPLIERS]
      .map((s) => ({ s, perTonne: overrides[s.id] * CERT_PRICE_EUR }))
      .sort((a, b) => a.perTonne - b.perTonne)
    const rankOf: Record<string, number> = {}
    ranked.forEach((r, i) => (rankOf[r.s.id] = i + 1))

    return { cumSaved, yearSaved, co2Cut, improved, ranked, rankOf }
  }, [overrides])

  return (
    <div className="space-y-6">
      <SectionTitle
        kicker="Green-payoff simulator"
        title="What if your suppliers decarbonised?"
        sub="Every supplier has its own what-if slider, starting from its sourced independent estimate. Drag any of them down and the aggregate ledger, each company's payoff, and the live shelf all update."
        right={
          <button
            onClick={resetAll}
            className="rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-mute hover:text-text"
          >
            ↺ Reset all
          </button>
        }
      />

      {/* Aggregate impact ledger — sums every slider */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-panel to-panel2">
          <div className="text-xs text-mute">CBAM saved in {SIM_YEAR}</div>
          <div className="stat-num mt-1 text-2xl font-bold text-brand">
            {EUR(Math.max(0, agg.yearSaved))}
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-panel to-panel2">
          <div className="text-xs text-mute">Cumulative 2026–2034</div>
          <div className="stat-num mt-1 text-2xl font-bold text-brand">
            {EUR(Math.max(0, agg.cumSaved))}
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-panel to-panel2">
          <div className="text-xs text-mute">CO₂ cut / yr</div>
          <div className="stat-num mt-1 text-2xl font-bold text-accent">
            {NUM(Math.max(0, agg.co2Cut))} t
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-panel to-panel2">
          <div className="text-xs text-mute">Suppliers improved</div>
          <div className="stat-num mt-1 text-2xl font-bold text-text">
            {agg.improved}
            <span className="text-sm text-mute"> / {SUPPLIERS.length}</span>
          </div>
        </Card>
      </div>

      {/* One interactive card per supplier */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SUPPLIERS.map((s, i) => {
          const baseline = BASELINE[s.id]
          const cur = overrides[s.id]
          const floor = +s.benchmark.toFixed(2)
          const ceil = +s.independentEstimate.high.toFixed(2)
          const improved = cur < baseline - 1e-9
          const pctCut = Math.round(((baseline - cur) / baseline) * 100)
          const yearSaved =
            supplierYearCost(s, SIM_YEAR).verifiedCost -
            supplierYearCost(s, SIM_YEAR, cur).verifiedCost
          const co2 = (baseline - cur) * s.annualTonnesImported

          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="stat-num text-xs text-mute">#{i + 1}</span>
                    <FlagEmoji code={s.countryCode} />
                    <span className="truncate font-semibold text-text">{s.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill>{s.commodity}</Pill>
                    {s.productionRoute !== 'n/a' && <Pill>{s.productionRoute}</Pill>}
                    {s.inSharedPool && <Pill tone="pool">◇ pool</Pill>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-mute">shelf rank</div>
                  <div className="stat-num text-lg font-semibold text-text">
                    #{agg.rankOf[s.id]}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-mute">
                sourced baseline{' '}
                <RangeBadge range={s.independentEstimate} confidence={s.estimateConfidence} />
              </div>

              {/* The slider */}
              <div className="mt-4">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs text-mute">Emissions intensity (what-if)</span>
                  <span className="stat-num text-xl font-semibold text-brand">
                    {NUM(cur, 2)} <span className="text-xs text-mute">tCO₂/t</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={floor}
                  max={ceil}
                  step={0.01}
                  value={cur}
                  onChange={(e) => setOne(s.id, +e.target.value)}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-[10px] text-mute">
                  <span>benchmark {NUM(floor, 2)}</span>
                  <span>est. high {NUM(ceil, 2)}</span>
                </div>
              </div>

              {/* Per-company payoff */}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-edge pt-3 text-center">
                <div>
                  <div className="text-[10px] text-mute">vs baseline</div>
                  {improved ? (
                    <div className="stat-num text-sm font-semibold text-brand">↓ {pctCut}%</div>
                  ) : (
                    <div className="text-sm text-mute">—</div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-mute">saved {SIM_YEAR}</div>
                  <div className="stat-num text-sm font-semibold text-brand">
                    {EUR(Math.max(0, yearSaved))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-mute">CO₂ cut/yr</div>
                  <div className="stat-num text-sm font-semibold text-accent">
                    {NUM(Math.max(0, co2))} t
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Live shelf — reflects every override */}
      <Card>
        <SectionTitle
          title="Live shelf — lower carbon cost per tonne ranks higher"
          sub={`Bar length = carbon cost per tonne in ${SIM_YEAR}; colour = intensity vs the commodity benchmark (green = clean, red = dirty). Drag any slider and watch a supplier shrink, green-up, and climb past its faded start position (◁).`}
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
            const max = Math.max(...Object.values(BASELINE_PER_TONNE)) || 1
            const delta = BASELINE_RANK[s.id] - (i + 1) // >0 = climbed up
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

      <p className="text-xs text-mute">
        Each slider is a what-if; its starting point is that supplier's sourced
        independent estimate. CBAM factor and cert price per{' '}
        <code className="text-mute">src/data/cbam.ts</code>.
      </p>
    </div>
  )
}
