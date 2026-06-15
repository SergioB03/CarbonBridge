import { useState } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SUPPLIERS } from '../data/suppliers'
import { HISTORY, facilityFor } from '../lib/history'
import { NUM } from '../lib/calc'
import { Card, SectionTitle, Pill, ConfidenceChip, FlagEmoji } from './ui'

const PROJ_END = 2034

// Build a blended series: real observed intensity (solid) → held-constant
// projection (dashed) past a "today" line, with a confidence band. This is the
// honest "blend": measured past, deterministic forward — not a prediction model.
function buildSeries(histId: number, confBand: number) {
  const f = facilityFor(histId)
  if (!f) return { rows: [], lastObs: 0, firstObs: 0 }
  const obs = f.series.filter((s) => !s.partial)
  const firstObs = obs[0]?.year ?? f.series[0].year
  const lastObs = obs[obs.length - 1]?.year ?? f.series[f.series.length - 1].year
  const held = f.latest.intensity
  const rows: Array<{
    year: number
    observed: number | null
    projected: number | null
    band: [number, number] | null
  }> = []
  for (const s of obs) {
    rows.push({
      year: s.year,
      observed: s.intensity,
      projected: s.year === lastObs ? s.intensity : null, // anchor dashed line
      band: [s.intensity * (1 - confBand), s.intensity * (1 + confBand)],
    })
  }
  for (let y = lastObs + 1; y <= PROJ_END; y++) {
    rows.push({
      year: y,
      observed: null,
      projected: held,
      band: [held * (1 - confBand), held * (1 + confBand)],
    })
  }
  return { rows, lastObs, firstObs }
}

export default function ProvenanceCard() {
  const [supId, setSupId] = useState(SUPPLIERS.find((s) => s.commodity === 'aluminium')?.id ?? SUPPLIERS[0].id)
  const sup = SUPPLIERS.find((s) => s.id === supId)!
  const fac = facilityFor(sup.historyId!)!
  const confBand = { high: 0.06, medium: 0.1, low: 0.2 }[fac.confidence] ?? 0.15
  const { rows, lastObs, firstObs } = buildSeries(sup.historyId!, confBand)
  const scopeShare = sup.fullFootprint ? Math.round((fac.latest.intensity / sup.fullFootprint) * 100) : null

  return (
    <Card>
      <SectionTitle
        kicker="Real provenance — observed → projected"
        title="This supplier's measured emissions history, then the legislated path"
        sub="Left of the line is real measured data from Climate TRACE. Right is held constant — not a forecast. The band reflects Climate TRACE's own confidence, not a guess."
        right={
          <select
            value={supId}
            onChange={(e) => setSupId(e.target.value)}
            className="rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-text"
          >
            {SUPPLIERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.facilityName}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <FlagEmoji code={sup.countryCode} />
        <span className="font-medium text-text">{fac.name}</span>
        <Pill>{sup.commodity}</Pill>
        {sup.productionRoute !== 'n/a' && <Pill>{sup.productionRoute}</Pill>}
        <ConfidenceChip level={fac.confidence as 'low' | 'medium' | 'high'} />
        <span className="text-mute">
          owner <span className="text-text">{fac.owner.parent}</span>
          {fac.owner.lei && (
            <span className="stat-num ml-1 text-accent" title="Real LEI — resolves in the Live data tab">
              · LEI {fac.owner.lei}
            </span>
          )}
        </span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="provBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" stroke="#7d8aa5" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#7d8aa5"
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, (max: number) => Math.ceil(max * 1.25 * 10) / 10]}
              tickFormatter={(v) => `${v}`}
              label={{ value: 'tCO₂e/t', angle: -90, position: 'insideLeft', fill: '#7d8aa5', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: '#121a2b', border: '1px solid #243049', borderRadius: 12, color: '#e6ecf7' }}
              formatter={(v: number, name) => {
                if (v == null) return ['—', '']
                const label = name === 'observed' ? 'Observed (Climate TRACE)' : name === 'projected' ? 'Projected (held constant)' : 'Confidence band'
                return [`${NUM(v, 2)} tCO₂e/t`, label]
              }}
              labelFormatter={(l) => `${l}`}
            />
            <Area type="monotone" dataKey="band" stroke="none" fill="url(#provBand)" connectNulls />
            <Line type="monotone" dataKey="observed" stroke="#34d399" strokeWidth={2.5} dot={{ r: 2 }} connectNulls name="observed" />
            <Line type="monotone" dataKey="projected" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls name="projected" />
            <ReferenceLine x={2026} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'CBAM begins', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-brand/70" /> observed {firstObs}–{lastObs} (real)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-accent/70" /> projected (held constant — drag it down in the simulator)</span>
      </div>

      {/* CBAM scope vs full footprint — the aluminium story */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-edge bg-panel2 p-3">
          <div className="text-[11px] text-mute">CBAM-scope intensity (priced)</div>
          <div className="stat-num text-xl font-semibold text-brand">
            {NUM(fac.latest.intensity, 2)} <span className="text-xs text-mute">tCO₂e/t</span>
          </div>
          <div className="mt-1 text-[11px] text-mute">
            {sup.commodity === 'steel' ? 'Direct + process emissions' : sup.commodity === 'aluminium' ? 'Direct + PFCs (electricity excluded)' : 'Direct process + fuel'}
          </div>
        </div>
        <div className="rounded-xl border border-edge bg-panel2 p-3">
          <div className="text-[11px] text-mute">Full cradle-to-gate footprint</div>
          <div className="stat-num text-xl font-semibold text-mute">
            {sup.fullFootprint ? NUM(sup.fullFootprint, 2) : '—'} <span className="text-xs text-mute">tCO₂e/t</span>
          </div>
          <div className="mt-1 text-[11px] text-mute">
            {scopeShare != null
              ? `incl. purchased electricity — only ~${scopeShare}% is CBAM-priced`
              : 'electricity-inclusive footprint'}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-mute">
        {HISTORY.source} · {HISTORY.release}. Climate TRACE figures are modelled
        satellite + ML estimates, not audited installation reports — a triage
        baseline, not a compliance number. Forward line is held constant (no
        decarbonisation assumed); the simulator lets you change it.
      </p>
    </Card>
  )
}
