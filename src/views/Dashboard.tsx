import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SUPPLIERS, IMPORTER } from '../data/suppliers'
import { CERT_PRICE_EUR } from '../data/cbam'
import { forecast, forecastTotals, EUR, NUM } from '../lib/calc'
import { flaggedSuppliers } from '../lib/flag'
import { Card, SectionTitle, Stat, Pill } from '../components/ui'

const TIMELINE = [
  {
    when: '2026',
    title: 'Liability accruing',
    body: 'Emissions count at a 2.5% CBAM factor — but no certificates are surrendered yet. Nothing leaves your account.',
    bar: 'bg-accent',
    text: 'text-accent',
  },
  {
    when: '30 Sep 2027',
    title: 'First payment due',
    body: 'First declaration and certificate surrender, covering 2026 imports. Certificate sales open Feb 2027.',
    bar: 'bg-warn',
    text: 'text-warn',
  },
  {
    when: '2034',
    title: 'Full rate',
    body: 'Free allocation fully phased out; the CBAM factor reaches 100% and the cost gap is at its widest.',
    bar: 'bg-danger',
    text: 'text-danger',
  },
] as const

export default function Dashboard() {
  const rows = forecast(SUPPLIERS)
  const { cumulativeAvoidable, firstPaymentYear, peak } = forecastTotals(rows)
  const y2026 = rows.find((r) => r.year === 2026)!
  const y2027 = rows.find((r) => r.year === 2027)!
  const totalTonnes = SUPPLIERS.reduce((a, s) => a + s.annualTonnesImported, 0)
  const flagged = flaggedSuppliers(SUPPLIERS)

  return (
    <div className="space-y-6">
      <SectionTitle
        kicker="Importer dashboard"
        title="Your accruing CBAM liability — and how much of it is avoidable"
        sub={`${IMPORTER.name} · ${NUM(totalTonnes)} t/yr of steel & aluminium imported (well above the 50 t exemption).`}
        right={
          <Pill tone="accent" title="Illustrative quarterly-average cert price">
            cert ≈ {EUR(CERT_PRICE_EUR)}/t (quarterly avg)
          </Pill>
        }
      />

      {/* Timeline-accurate framing — three distinct phases, not a run-on */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">
          CBAM timeline — what happens when
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIMELINE.map((s, i) => (
            <div key={s.when} className="card relative overflow-hidden p-4">
              <span className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} />
              <div className="flex items-center justify-between">
                <span className={`stat-num text-base font-semibold ${s.text}`}>
                  {s.when}
                </span>
                <span className="chip border-edge text-mute">Phase {i + 1}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-text">{s.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-mute">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="2026 — accruing liability"
          value={EUR(y2026.defaultCost)}
          sub="Building now · first bill Sept 2027"
          tone="accent"
        />
        <Stat
          label="First payment (2027)"
          value={EUR(y2027.defaultCost)}
          sub="Due 30 Sep 2027 if stuck on defaults"
          tone="warn"
        />
        <Stat
          label="Avoidable overpayment 2026–2034"
          value={EUR(cumulativeAvoidable)}
          sub="Default values vs verified actuals"
          tone="good"
        />
        <Stat
          label="Verify first"
          value={`${flagged.length} supplier${flagged.length === 1 ? '' : 's'}`}
          sub="Private triage — see Verification Priority"
          tone="danger"
        />
      </div>

      {/* The rising curve — NOT a flat 2026 overpayment */}
      <Card>
        <SectionTitle
          title="Cost trajectory 2026–2034"
          sub="The gap between punitive default values and verified actuals widens as free allocation phases out. The avoidable slice (green) is what verified supplier data kills."
        />
        <div className="h-[320px] w-full">
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
              <XAxis dataKey="year" stroke="#7d8aa5" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#7d8aa5"
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) => `€${NUM(Number(v) / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#121a2b',
                  border: '1px solid #243049',
                  borderRadius: 12,
                  color: '#e6ecf7',
                }}
                formatter={(v: number, name) => [
                  EUR(v),
                  name === 'defaultCost'
                    ? 'On default values'
                    : 'With verified data',
                ]}
                labelFormatter={(l) => `Year ${l}`}
              />
              <Area
                type="monotone"
                dataKey="defaultCost"
                stroke="#f87171"
                strokeWidth={2}
                fill="url(#gDefault)"
                name="defaultCost"
              />
              <Area
                type="monotone"
                dataKey="verifiedCost"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#gVerified)"
                name="verifiedCost"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-mute">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-danger/70" /> Cost on
            punitive default values
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm bg-brand/70" /> Cost with
            verified supplier data
          </span>
          <span className="ml-auto">
            Peak avoidable (2034): <span className="text-brand">{EUR(peak.avoidable)}</span>
            /yr · first payment {firstPaymentYear}
          </span>
        </div>
      </Card>

      <p className="text-xs text-mute">
        All figures are illustrative mock values. The legal cert price is the
        Commission's quarterly average, modelled here as a fixed rate. Default
        intensities and mark-ups follow Reg. (EU) 2025/2621.
      </p>
    </div>
  )
}
