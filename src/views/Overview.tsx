import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SUPPLIERS, IMPORTER } from '../data/suppliers'
import { CERT_PRICE_EUR } from '../data/cbam'
import {
  forecast,
  forecastTotals,
  supplierYearCost,
  EUR,
  NUM,
} from '../lib/calc'
import { flaggedSuppliers, evaluateFlag } from '../lib/flag'
import { productFor } from '../data/products'
import { byMaterial, MATERIALS } from '../lib/material'
import { useAppState, useMode } from '../state/appState'
import {
  Card,
  SectionTitle,
  Stat,
  Pill,
  RangeBadge,
  VerifyBadge,
  FlagEmoji,
  PitchNote,
} from '../components/ui'
import FacilityMap from './FacilityMap'
import ProvenanceCard from '../components/ProvenanceCard'

const DECLARATION_DUE = new Date('2027-09-30T00:00:00Z')
const YEARS = [2026, 2027, 2030, 2034]

const TIMELINE = [
  { when: '2026', title: 'Liability accruing', body: 'Emissions count at a 2.5% CBAM factor — but no certificates are surrendered yet. Nothing leaves your account.', bar: 'bg-accent', text: 'text-accent' },
  { when: '30 Sep 2027', title: 'First payment due', body: 'First declaration and certificate surrender, covering 2026 imports. Certificate sales open Feb 2027.', bar: 'bg-warn', text: 'text-warn' },
  { when: '2034', title: 'Full rate', body: 'Free allocation fully phased out; the CBAM factor reaches 100% and the cost gap is at its widest.', bar: 'bg-danger', text: 'text-danger' },
] as const

export default function Overview() {
  const { material, statusOf, requestVerification, setView } = useAppState()
  const mode = useMode()
  const [year, setYear] = useState(2030)

  const suppliers = byMaterial(SUPPLIERS, material)
  const materialLabel = MATERIALS.find((m) => m.id === material)!.label
  const lens = material === 'all' ? 'steel, aluminium & cement' : materialLabel.toLowerCase()

  const rows = forecast(suppliers)
  const { cumulativeAvoidable, firstPaymentYear, peak } = forecastTotals(rows)
  const y2026 = rows.find((r) => r.year === 2026)!
  const totalTonnes = suppliers.reduce((a, s) => a + s.annualTonnesImported, 0)
  const flagged = flaggedSuppliers(suppliers)

  const daysToDue = Math.max(
    0,
    Math.ceil((DECLARATION_DUE.getTime() - new Date().getTime()) / 86_400_000),
  )

  // Attention queue — what needs the importer's action, ranked.
  type Item = { id: string; name: string; product: string; reason: string; kind: 'verify' | 'request' | 'awaiting'; severity?: 'priority' | 'watch'; rank: number }
  const items: Item[] = []
  for (const s of suppliers) {
    if (s.inSharedPool) continue
    const st = statusOf(s.id)
    if (st === 'received') continue
    const flag = evaluateFlag(s)
    const product = productFor(s.cnCode).name
    if (st === 'requested') {
      items.push({ id: s.id, name: s.name, product, reason: 'Verified data requested — awaiting supplier', kind: 'awaiting', rank: 2 })
    } else if (flag.flagged) {
      items.push({ id: s.id, name: s.name, product, reason: `Self-report diverges −${Math.round(flag.divergence * 100)}% below the independent estimate`, kind: 'verify', severity: flag.severity === 'priority' ? 'priority' : 'watch', rank: 0 })
    } else {
      items.push({ id: s.id, name: s.name, product, reason: 'No verified data on file — on punitive default values', kind: 'request', rank: 1 })
    }
  }
  items.sort((a, b) => a.rank - b.rank)
  const open = items.filter((i) => i.kind !== 'awaiting').length

  // Per-supplier breakdown for the selected year.
  const ranked = [...suppliers]
    .map((s) => ({ s, cost: supplierYearCost(s, year) }))
    .sort((a, b) => b.cost.avoidable - a.cost.avoidable)
  const maxCost = Math.max(...ranked.map((r) => r.cost.defaultCost), 1)
  const yearAvoidable = ranked.reduce((a, r) => a + r.cost.avoidable, 0)

  return (
    <div className="space-y-6">
      <SectionTitle
        kicker={`${IMPORTER.name} · EORI ${IMPORTER.eori}`}
        title={material === 'all' ? 'CBAM workspace' : `${materialLabel} — CBAM workspace`}
        sub={`Your obligations, exposure and where it sits — ${NUM(totalTonnes)} t/yr of ${lens}.`}
        right={
          <Pill tone="accent" title="Illustrative quarterly-average cert price">
            cert ≈ {EUR(CERT_PRICE_EUR)}/t
          </Pill>
        }
      />

      {mode === 'pitch' && (
        <PitchNote title="How to read these numbers">
          Independent estimates, facilities, owners and routes are <strong>real</strong>{' '}
          (Climate TRACE, CC BY 4.0); self-reported figures are illustrative supplier claims.
          Costs follow the actual CBAM phase-in — <strong>2026 only accrues at a 2.5% factor</strong>,
          the <strong>first bill is 30 Sep 2027</strong>, and free allocation phases out to 100% by 2034.
          Default values & mark-ups follow Reg. (EU) 2025/2621; the cert price is the Commission's
          quarterly average modelled as a fixed rate. Free allocation is modelled via the phase-in
          factor (not a separate benchmark deduction) to avoid double-counting.
        </PitchNote>
      )}

      {/* Owe / due / attention */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card relative overflow-hidden p-4">
          <span className="absolute inset-x-0 top-0 h-1 bg-warn" />
          <div className="text-xs font-medium uppercase tracking-wide text-mute">First declaration due</div>
          <div className="stat-num mt-1 text-2xl font-semibold text-warn">{NUM(daysToDue)} days</div>
          <div className="mt-1 text-xs text-mute">30 Sep 2027 · covers 2026 imports</div>
        </div>
        <Stat label="2026 liability accruing" value={EUR(y2026.defaultCost)} sub="No cash out yet — building" tone="accent" />
        <Stat label="Avoidable 2026–2034" value={EUR(cumulativeAvoidable)} sub="With verified supplier data" tone="good" />
        <Stat label="Suppliers needing action" value={open} sub={`${items.length - open} awaiting · ${flagged.length} flagged`} tone={open > 0 ? 'danger' : 'good'} />
      </div>

      {/* Attention queue */}
      <Card className="!p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <SectionTitle title="Needs your attention" sub="Request verified data where it cuts cost or clears a flag." />
          <button onClick={() => setView('suppliers')} className="shrink-0 text-xs text-accent hover:underline">
            open suppliers →
          </button>
        </div>
        {items.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-mute">All clear — every supplier here is verified or in the pool. 🎉</div>
        ) : (
          <div className="divide-y divide-edge border-t border-edge">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${it.kind === 'verify' ? 'bg-warn' : it.kind === 'request' ? 'bg-accent' : 'bg-mute'}`} />
                    <span className="truncate text-sm font-medium text-text">{it.name}</span>
                    {it.kind === 'verify' && it.severity && <VerifyBadge severity={it.severity} />}
                    {it.kind === 'awaiting' && <Pill tone="good">requested</Pill>}
                  </div>
                  <div className="mt-0.5 pl-4 text-xs text-mute">
                    <span className="text-text">{it.product}</span> · {it.reason}
                  </div>
                </div>
                {it.kind !== 'awaiting' ? (
                  <button onClick={() => requestVerification(it.id)} className="shrink-0 rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10">
                    Request verified data
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-mute">awaiting supplier</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* CBAM timeline */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">CBAM timeline — what happens when</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIMELINE.map((s, i) => (
            <div key={s.when} className="card relative overflow-hidden p-4">
              <span className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
              <div className="flex items-center justify-between">
                <span className={`stat-num text-base font-semibold ${s.text}`}>{s.when}</span>
                <span className="chip border-edge text-mute">Phase {i + 1}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-text">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-mute">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cost trajectory */}
      <Card>
        <SectionTitle
          title="Cost trajectory 2026–2034"
          sub="The gap between punitive default values and verified actuals widens as free allocation phases out. The avoidable slice (green) is what verified supplier data kills. Pick a year to break it down by supplier below."
          right={
            <div className="flex items-center gap-1 rounded-xl border border-edge bg-panel2 p-1">
              {YEARS.map((y) => (
                <button key={y} onClick={() => setYear(y)} className={`rounded-lg px-3 py-1 text-sm transition ${y === year ? 'bg-brand/15 text-brand' : 'text-mute hover:text-text'}`}>
                  {y}
                </button>
              ))}
            </div>
          }
        />
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gDefault" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gVerified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#243049" vertical={false} />
              <ReferenceLine x={year} stroke="#e6ecf7" strokeOpacity={0.5} strokeDasharray="4 3" label={{ value: `${year}`, fill: '#e6ecf7', fontSize: 11, position: 'top' }} />
              <XAxis dataKey="year" stroke="#7d8aa5" tickLine={false} axisLine={false} />
              <YAxis stroke="#7d8aa5" tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `€${NUM(Number(v) / 1000)}k`} />
              <Tooltip contentStyle={{ background: '#121a2b', border: '1px solid #243049', borderRadius: 12, color: '#e6ecf7' }} formatter={(v: number, name) => [EUR(v), name === 'defaultCost' ? 'On default values' : 'With verified data']} labelFormatter={(l) => `Year ${l}`} />
              <Area type="monotone" dataKey="defaultCost" stroke="#f87171" strokeWidth={2} fill="url(#gDefault)" name="defaultCost" />
              <Area type="monotone" dataKey="verifiedCost" stroke="#34d399" strokeWidth={2} fill="url(#gVerified)" name="verifiedCost" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-mute">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-danger/70" /> Cost on punitive default values</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-brand/70" /> Cost with verified supplier data</span>
          <span className="ml-auto">Peak avoidable (2034): <span className="text-brand">{EUR(peak.avoidable)}</span>/yr · first payment {firstPaymentYear}</span>
        </div>
      </Card>

      {/* Per-supplier breakdown */}
      <Card className="!p-0">
        <div className="px-5 pt-5">
          <SectionTitle
            title={`Where the cost concentrates — by supplier (${year})`}
            sub="Each bar splits the unavoidable verified cost (green) from the avoidable overpayment on default values (red). Independent estimates shown as a range + confidence — never a single hard number."
            right={
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-mute">avoidable in {year}</div>
                <div className="stat-num text-xl font-semibold text-brand">{EUR(yearAvoidable)}</div>
              </div>
            }
          />
        </div>
        <div className="divide-y divide-edge border-t border-edge">
          {ranked.map(({ s, cost }, i) => {
            const flag = evaluateFlag(s)
            const verifiedPct = (cost.verifiedCost / maxCost) * 100
            const avoidablePct = (cost.avoidable / maxCost) * 100
            return (
              <div key={s.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3.5">
                <div className="col-span-12 lg:col-span-4">
                  <div className="flex items-center gap-2">
                    <span className="stat-num w-6 text-sm text-mute">#{i + 1}</span>
                    <FlagEmoji code={s.countryCode} />
                    <span className="truncate font-medium text-text">{s.name}</span>
                    {flag.flagged && <VerifyBadge severity={flag.severity === 'priority' ? 'priority' : 'watch'} />}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-8">
                    <Pill title={`CN ${productFor(s.cnCode).cn}`}>{productFor(s.cnCode).name}</Pill>
                    {s.productionRoute !== 'n/a' && <Pill>{s.productionRoute}</Pill>}
                    {s.inSharedPool && <Pill tone="pool">◇ pool</Pill>}
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-5">
                  <div className="flex h-6 w-full overflow-hidden rounded-lg bg-panel2">
                    <div className="h-full bg-brand/60" style={{ width: `${verifiedPct}%` }} title={`Verified cost ${EUR(cost.verifiedCost)}`} />
                    <div className="h-full bg-danger/55" style={{ width: `${avoidablePct}%` }} title={`Avoidable overpayment ${EUR(cost.avoidable)}`} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-mute">
                    <span>verified <span className="text-brand">{EUR(cost.verifiedCost)}</span></span>
                    <span>avoidable <span className="text-danger">{EUR(cost.avoidable)}</span></span>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-3 lg:text-right">
                  <div className="lg:flex lg:justify-end">
                    <RangeBadge range={s.independentEstimate} confidence={s.estimateConfidence} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Where it sits — the map, folded into the home */}
      <FacilityMap />

      {/* Blended real-history → projection */}
      <ProvenanceCard />
    </div>
  )
}
