import { useMemo, useState } from 'react'
import { SUPPLIERS } from '../data/suppliers'
import { evaluateFlag, midpoint, DIVERGENCE_THRESHOLD } from '../lib/flag'
import { NUM } from '../lib/calc'
import { productFor, poolVerifierCount } from '../data/products'
import { byMaterial, MATERIALS } from '../lib/material'
import { useAppState, type VerifyStatus } from '../state/appState'
import type { Supplier } from '../types'
import { Card, SectionTitle, RangeBadge, Pill, VerifyBadge, FlagEmoji, PitchNote } from '../components/ui'

type Stage = 'pool' | 'received' | 'requested' | 'flagged' | 'unverified'

function stageOf(s: Supplier, status: VerifyStatus, threshold: number): Stage {
  if (s.inSharedPool) return 'pool'
  if (status === 'received') return 'received'
  if (status === 'requested') return 'requested'
  if (evaluateFlag(s, threshold).flagged) return 'flagged'
  return 'unverified'
}

const ORDER: Record<Stage, number> = { flagged: 0, unverified: 1, requested: 2, received: 3, pool: 4 }

/** Independent estimate band + self-report marker + the live flag gate. */
function DivergenceBar({ s, threshold }: { s: Supplier; threshold: number }) {
  const lo = s.independentEstimate.low
  const hi = s.independentEstimate.high
  const mid = midpoint(s)
  const gate = mid * (1 - threshold)
  const min = Math.min(s.selfReported, lo, gate) * 0.9
  const max = hi * 1.1
  const span = max - min || 1
  const pct = (v: number) => ((v - min) / span) * 100
  return (
    <div className="mt-3">
      <div className="relative h-8">
        <div className="absolute top-3 h-2 w-full rounded-full bg-panel2" />
        <div className="absolute top-3 h-2 rounded-full bg-brand/40" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} title={`Independent estimate ${lo}–${hi}`} />
        <div className="absolute top-1 h-6 w-px bg-warn/70 transition-all duration-200" style={{ left: `${pct(gate)}%` }} title={`Flag gate at −${Math.round(threshold * 100)}%`} />
        <div className="absolute top-1.5 flex -translate-x-1/2 flex-col items-center transition-all duration-200" style={{ left: `${pct(s.selfReported)}%` }}>
          <div className="h-5 w-0.5 bg-text" />
        </div>
        <div className="absolute -translate-x-1/2 text-[10px] text-text transition-all duration-200" style={{ left: `${pct(s.selfReported)}%`, top: 0 }}>
          self {NUM(s.selfReported, 2)}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-mute">
        <span>independent {lo}–{hi} tCO₂/t</span>
        <span className="text-warn">gate −{Math.round(threshold * 100)}%</span>
      </div>
    </div>
  )
}

export default function Suppliers() {
  const { material, mode, statusOf, requestVerification, markReceived, resetVerification } = useAppState()
  const [threshold, setThreshold] = useState(DIVERGENCE_THRESHOLD)

  const suppliers = byMaterial(SUPPLIERS, material)
  const materialLabel = MATERIALS.find((m) => m.id === material)!.label

  const rows = useMemo(
    () =>
      [...suppliers]
        .map((s) => ({ s, status: statusOf(s.id), stage: stageOf(s, statusOf(s.id), threshold) }))
        .sort((a, b) => ORDER[a.stage] - ORDER[b.stage]),
    [suppliers, statusOf, threshold],
  )

  const counts = rows.reduce((a, r) => ((a[r.stage] = (a[r.stage] ?? 0) + 1), a), {} as Record<Stage, number>)
  const verified = (counts.pool ?? 0) + (counts.received ?? 0)

  // Verify-first queue: flagged suppliers with no request out yet.
  const priority = suppliers
    .map((s) => ({ s, flag: evaluateFlag(s, threshold) }))
    .filter((e) => e.flag.flagged && statusOf(e.s.id) === 'none')

  return (
    <div className="space-y-6">
      <SectionTitle
        kicker="Suppliers"
        title={material === 'all' ? 'Verify first, then track every supplier' : `${materialLabel} suppliers — verify first, then track`}
        sub="The priority queue is a private triage signal (importer view only) — where to spend a limited verification budget. Requests here and on the Overview stay in sync."
        right={
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="stat-num text-xl font-semibold text-brand">{verified}/{suppliers.length}</div>
              <div className="text-[11px] text-mute">verified or in pool</div>
            </div>
            <button onClick={resetVerification} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-mute hover:text-text">
              ↺ reset
            </button>
          </div>
        }
      />

      {mode === 'pitch' && (
        <PitchNote title="Why the flag is defensible (and what it never claims)">
          We flag only where a supplier's self-report <strong>diverges below an independent estimate</strong>{' '}
          by more than your threshold, <strong>and</strong> only when that estimate is confident enough —
          low-confidence estimates are never flagged. The estimate is always a <strong>range + confidence</strong>,
          never a single hard number, and the wording is always <strong>"recommend verification," never "false"</strong>.
          Climate TRACE facility figures are modelled (a peer-reviewed study found power-plant CO₂ ran ~50% low
          vs an established inventory), so this is a <strong>private triage signal, not a public accusation</strong>.
        </PitchNote>
      )}

      {/* Triage framing + sensitivity control */}
      <Card className="border-l-4 border-l-warn">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="lg:w-1/2">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
              <Pill tone="warn">🔒 Private — importer view only</Pill>
              <span>Triage signal, not an accusation</span>
            </div>
            <div className="mb-1 mt-3 flex items-baseline justify-between">
              <span className="text-sm text-mute">Flag sensitivity — divergence threshold</span>
              <span className="stat-num text-lg font-semibold text-warn">−{Math.round(threshold * 100)}%</span>
            </div>
            <input type="range" min={0.05} max={0.4} step={0.01} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-full accent-warn" />
            <div className="flex justify-between text-[11px] text-mute">
              <span>more sensitive (5%)</span>
              <span>stricter (40%)</span>
            </div>
          </div>
          <p className="max-w-sm text-xs text-mute">
            Drag the threshold to change how aggressively suppliers are surfaced for verification. The queue,
            the table flags and the Overview to-dos all recompute live.
          </p>
        </div>
      </Card>

      {/* Verify-first priority queue */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warn">⚑ Verify first ({priority.length})</h3>
        {priority.length === 0 ? (
          <Card><p className="text-sm text-mute">Nothing in the queue — lower the sensitivity to surface borderline suppliers, or every flag already has a request out. 🎉</p></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {priority.map(({ s, flag }) => (
              <Card key={s.id} className="border-warn/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FlagEmoji code={s.countryCode} />
                      <span className="font-semibold text-text">{s.name}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-mute">{s.facilityName ?? 'installation unresolved'} · {s.country}</div>
                  </div>
                  <VerifyBadge severity={flag.severity === 'priority' ? 'priority' : 'watch'} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill title={`CN ${productFor(s.cnCode).cn}`}>{productFor(s.cnCode).name}</Pill>
                  {s.productionRoute !== 'n/a' && <Pill>{s.productionRoute}</Pill>}
                  <Pill title="Entity-resolution confidence">match: {s.matchConfidence}</Pill>
                  <Pill tone="warn">diverges −{Math.round(flag.divergence * 100)}%</Pill>
                </div>
                <DivergenceBar s={s} threshold={threshold} />
                <p className="mt-3 rounded-lg bg-panel2 p-3 text-xs text-mute">{flag.reason}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <RangeBadge range={s.independentEstimate} confidence={s.estimateConfidence} />
                  <button onClick={() => requestVerification(s.id)} className="rounded-lg border border-warn/40 px-3 py-1.5 font-medium text-warn transition hover:bg-warn/10">
                    Request verified data →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Full tracker table */}
      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-edge px-5 py-3 text-sm font-semibold text-text">All suppliers — verification workflow</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wide text-mute">
                <th className="px-5 py-2.5 font-medium">Supplier</th>
                <th className="px-3 py-2.5 font-medium">Product · CN</th>
                <th className="px-3 py-2.5 font-medium">Independent estimate</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, stage }) => {
                const p = productFor(s.cnCode)
                return (
                  <tr key={s.id} className="border-b border-edge/50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FlagEmoji code={s.countryCode} />
                        <span className="font-medium text-text">{s.name}</span>
                        {stage === 'flagged' && <VerifyBadge severity={evaluateFlag(s, threshold).severity === 'priority' ? 'priority' : 'watch'} />}
                      </div>
                      <div className="mt-0.5 pl-7 text-[11px] text-mute">{s.country}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-text">{p.name}</div>
                      <div className="stat-num text-[11px] text-mute">CN {p.cn}</div>
                    </td>
                    <td className="px-3 py-3"><RangeBadge range={s.independentEstimate} confidence={s.estimateConfidence} /></td>
                    <td className="px-3 py-3"><StatusCell stage={stage} id={s.id} /></td>
                    <td className="px-5 py-3 text-right">
                      {stage === 'flagged' || stage === 'unverified' ? (
                        <button onClick={() => requestVerification(s.id)} className="rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10">Request data</button>
                      ) : stage === 'requested' ? (
                        <button onClick={() => markReceived(s.id)} className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-mute hover:text-text">Mark received</button>
                      ) : (
                        <span className="text-xs text-mute">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-mute">
        "In pool" suppliers reuse verified data shared by other unaffiliated importers — the cross-company moat. Status here is
        local to this session (a real deployment persists it and emails the supplier the request). We never label a supplier
        "false" — only "diverges, recommend verification."
      </p>
    </div>
  )
}

function StatusCell({ stage, id }: { stage: Stage; id: string }) {
  if (stage === 'pool')
    return <Pill tone="pool" title="Reuses verified data from the shared cross-company pool">◇ in pool · verified by {poolVerifierCount(id)} importers</Pill>
  if (stage === 'received') return <Pill tone="good">✓ verified data received</Pill>
  if (stage === 'requested') return <Pill tone="accent">↗ requested · awaiting</Pill>
  if (stage === 'flagged') return <Pill tone="warn">⚑ verify first</Pill>
  return <Pill>on default values</Pill>
}
