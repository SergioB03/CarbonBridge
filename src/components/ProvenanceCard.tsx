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
import { byMaterial } from '../lib/material'
import { useAppState, useMode } from '../state/appState'
import { Card, SectionTitle, Pill, ConfidenceChip, FlagEmoji } from './ui'

const PROJ_END = 2034

// Build the blended series. We plot TWO real measured signals, because the
// CBAM-priced intensity is a constant emissions factor in Climate TRACE (so on
// its own it's a flat line), while the full cradle-to-gate footprint genuinely
// MOVES year to year — mostly as the supplier's grid electricity changes:
//   • full  = full cradle-to-gate intensity (the real movement, the hero line)
//   • priced = CBAM-scope intensity (the flat factor we actually price/project)
// Observed years are solid; past the last observed year each is HELD CONSTANT
// (dashed) to 2034 — an honest deterministic path, not a forecast. The band is
// the supplier's own confidence wrapped around the full footprint.
function buildSeries(histId: number, confBand: number) {
  const f = facilityFor(histId)
  if (!f) return { rows: [], lastObs: 0, firstObs: 0, hasFull: false }
  const obs = f.series.filter((s) => !s.partial)
  const firstObs = obs[0]?.year ?? f.series[0].year
  const lastObs = obs[obs.length - 1]?.year ?? f.series[f.series.length - 1].year
  const hasFull = f.latest.fullIntensity != null
  const heldPriced = f.latest.intensity
  const heldFull = f.latest.fullIntensity ?? f.latest.intensity
  const rows: Array<{
    year: number
    obsFull: number | null
    obsPriced: number | null
    projFull: number | null
    projPriced: number | null
    band: [number, number] | null
  }> = []
  for (const s of obs) {
    const full = s.fullIntensity ?? s.intensity
    rows.push({
      year: s.year,
      obsFull: full,
      obsPriced: s.intensity,
      projFull: s.year === lastObs ? full : null, // anchor dashed lines
      projPriced: s.year === lastObs ? s.intensity : null,
      band: [full * (1 - confBand), full * (1 + confBand)],
    })
  }
  for (let y = lastObs + 1; y <= PROJ_END; y++) {
    rows.push({
      year: y,
      obsFull: null,
      obsPriced: null,
      projFull: heldFull,
      projPriced: heldPriced,
      band: [heldFull * (1 - confBand), heldFull * (1 + confBand)],
    })
  }
  return { rows, lastObs, firstObs, hasFull }
}

export default function ProvenanceCard() {
  const mode = useMode()
  const { material } = useAppState()
  const pool = byMaterial(SUPPLIERS, material)
  const [supId, setSupId] = useState(SUPPLIERS.find((s) => s.commodity === 'aluminium')?.id ?? SUPPLIERS[0].id)
  // Keep the selected supplier valid for the active material lens.
  const sup = pool.find((s) => s.id === supId) ?? pool[0] ?? SUPPLIERS[0]
  const fac = facilityFor(sup.historyId!)!
  const confBand = { high: 0.06, medium: 0.1, low: 0.2 }[fac.confidence] ?? 0.15
  const { rows, lastObs, firstObs, hasFull } = buildSeries(sup.historyId!, confBand)
  const scopeShare = sup.fullFootprint ? Math.round((fac.latest.intensity / sup.fullFootprint) * 100) : null

  return (
    <Card>
      <SectionTitle
        kicker="Real provenance — observed → projected"
        title="This supplier's measured emissions history, then the legislated path"
        sub="Two real measured signals: the full cradle-to-gate footprint (which moves year to year, mostly with the grid) and the flatter CBAM-priced slice. Left of 2026 is observed Climate TRACE data; right is held constant — not a forecast. The band is the supplier's own confidence."
        right={
          <select
            value={supId}
            onChange={(e) => setSupId(e.target.value)}
            className="rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-text"
          >
            {pool.map((s) => (
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
        {fac.illustrative && (
          <Pill title="Real plant, owner & LEI; emissions calibrated — not from the Climate TRACE extract">est.</Pill>
        )}
        <Pill>{sup.commodity}</Pill>
        {sup.productionRoute !== 'n/a' && <Pill>{sup.productionRoute}</Pill>}
        <ConfidenceChip level={fac.confidence as 'low' | 'medium' | 'high'} />
        <span className="text-mute">
          owner <span className="text-text">{fac.owner.parent}</span>
          {fac.owner.lei && (
            <span className="stat-num ml-1 text-accent" title="Real LEI — resolves live in the Evidence tab">
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
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.04} />
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
                const label =
                  name === 'obsFull' ? 'Full cradle-to-gate (observed)'
                  : name === 'projFull' ? 'Full footprint (held constant)'
                  : name === 'obsPriced' ? 'CBAM-priced (observed)'
                  : name === 'projPriced' ? 'CBAM-priced (held constant)'
                  : 'Confidence band'
                return [`${NUM(v, 2)} tCO₂e/t`, label]
              }}
              labelFormatter={(l) => `${l}`}
            />
            <Area type="monotone" dataKey="band" stroke="none" fill="url(#provBand)" connectNulls />
            {/* Full cradle-to-gate footprint — the real year-to-year movement */}
            <Line type="monotone" dataKey="obsFull" stroke="#34d399" strokeWidth={2.5} dot={{ r: 2 }} connectNulls name="obsFull" />
            <Line type="monotone" dataKey="projFull" stroke="#34d399" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls name="projFull" />
            {/* CBAM-priced slice — the flatter emissions factor we actually price */}
            <Line type="monotone" dataKey="obsPriced" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} connectNulls name="obsPriced" />
            <Line type="monotone" dataKey="projPriced" stroke="#60a5fa" strokeWidth={1.75} strokeDasharray="5 4" dot={false} connectNulls name="projPriced" />
            <ReferenceLine x={2026} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'CBAM begins', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-brand/70" /> full cradle-to-gate {firstObs}–{lastObs} {hasFull ? '(real, moves with the grid)' : '(= CBAM-priced — no electricity layer)'}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-accent/70" /> CBAM-priced slice (the flat factor we price)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-3 border-t-2 border-dashed border-mute" /> held constant to 2034 — drag it down in the simulator</span>
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
        {HISTORY.source} · {HISTORY.release}.
        {mode === 'pitch' &&
          ' Climate TRACE figures are modelled satellite + ML estimates, not audited installation reports — a triage baseline, not a compliance number. Forward line is held constant (no decarbonisation assumed); the simulator lets you change it.'}
      </p>
    </Card>
  )
}
