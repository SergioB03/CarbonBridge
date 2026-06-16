import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'
import { SUPPLIERS } from '../data/suppliers'
import { verifiedIntensity, NUM } from '../lib/calc'
import { evaluateFlag } from '../lib/flag'
import { byMaterial } from '../lib/material'
import { useAppState } from '../state/appState'
import type { Supplier } from '../types'
import { Card, SectionTitle, RangeBadge, Pill, FlagEmoji, VerifyBadge } from '../components/ui'

const GEO_URL = '/countries-110m.json'

// Color by how far above the commodity benchmark a facility runs (comparable
// across steel/aluminium/cement). Size by network demand (tonnes imported).
const colorFor = scaleLinear<string>()
  .domain([1, 1.6, 2.4])
  .range(['#34d399', '#f59e0b', '#f87171'])
  .clamp(true)

const maxTonnes = Math.max(...SUPPLIERS.map((s) => s.annualTonnesImported))
const radiusFor = scaleLinear().domain([0, maxTonnes]).range([7, 18]).clamp(true)

/** Embeddable map card (used on the Overview). Filters by the active material. */
export default function FacilityMap() {
  const { material } = useAppState()
  const suppliers = byMaterial(SUPPLIERS, material)
  const [hover, setHover] = useState<Supplier | null>(null)
  const [pinned, setPinned] = useState<Supplier | null>(null)
  const active = hover ?? pinned

  // Render order fixes occlusion in clusters: biggest dots first (so smaller
  // ones sit on top and stay reachable), and the active dot drawn LAST of all so
  // it's never hidden under a neighbour.
  const drawOrder = [...suppliers]
    .sort((a, b) => b.annualTonnesImported - a.annualTonnesImported)
    .sort((a, b) => (a.id === active?.id ? 1 : 0) - (b.id === active?.id ? 1 : 0))

  // The side list is grouped/sorted by country so clustered facilities are
  // trivially selectable even when their dots overlap.
  const listOrder = [...suppliers].sort(
    (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
  )

  return (
    <div className="space-y-4">
      <SectionTitle
        kicker="Facility map"
        title="Where the carbon — and the network demand — sits"
        sub="Dot colour = emissions intensity vs the commodity benchmark. Dot size = how much you import. Ringed dots carry a private verification-priority flag. Hover the list on the right to pick out clustered facilities."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Map */}
        <Card className="!p-0 overflow-hidden lg:col-span-2">
          <div className="relative">
            <div className="bg-[#0e1626]">
              <ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{ scale: 175 }}
                width={980}
                height={460}
                style={{ width: '100%', height: 'auto' }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#1b2942"
                        stroke="#6b7da3"
                        strokeWidth={0.7}
                        style={{
                          default: { outline: 'none' },
                          hover: { fill: '#243a5e', outline: 'none' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {drawOrder.map((s) => {
                  const flag = evaluateFlag(s)
                  const r = radiusFor(s.annualTonnesImported)
                  const fill = colorFor(verifiedIntensity(s) / s.benchmark)
                  const isActive = active?.id === s.id
                  return (
                    <Marker
                      key={s.id}
                      coordinates={[s.lon, s.lat]}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setPinned(s)}
                      style={{ default: { cursor: 'pointer' } }}
                    >
                      {/* small invisible hit-area — just enough to ease clicking
                          without swallowing neighbouring dots in a cluster */}
                      <circle r={r + 3} fill="transparent" />
                      {flag.flagged && (
                        <circle
                          r={r + 4}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          strokeDasharray="3 2"
                          opacity={0.9}
                        />
                      )}
                      {isActive && (
                        <circle r={r + 6} fill="none" stroke="#e6ecf7" strokeWidth={1} opacity={0.5} />
                      )}
                      <circle
                        r={isActive ? r + 1.5 : r}
                        fill={fill}
                        fillOpacity={isActive ? 1 : 0.7}
                        stroke={isActive ? '#e6ecf7' : '#0b1220'}
                        strokeWidth={isActive ? 2 : 1}
                      />
                    </Marker>
                  )
                })}
              </ComposableMap>
            </div>

            {/* Legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-2 rounded-xl border border-edge bg-panel/90 p-3 text-[11px] text-mute backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">Intensity vs benchmark</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-2 w-10 rounded-sm" style={{ background: 'linear-gradient(90deg,#34d399,#f59e0b,#f87171)' }} />
                <span>at benchmark → 2.4×+</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-mute/50" />
                <span>size = tonnes imported</span>
                <span className="ml-2 inline-block h-3 w-3 rounded-full border border-dashed border-warn" />
                <span>= verify-priority</span>
              </div>
            </div>

            {/* Hover/pinned detail */}
            {active && (
              <div className="absolute right-3 top-3 w-72 rounded-xl border border-edge bg-panel/95 p-4 text-sm backdrop-blur">
                <div className="flex items-center gap-2">
                  <FlagEmoji code={active.countryCode} />
                  <span className="font-semibold text-text">{active.name}</span>
                </div>
                <div className="mt-0.5 text-xs text-mute">
                  {active.facilityName ?? 'Producing installation unresolved'} · {active.country}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill>{active.commodity}</Pill>
                  {active.productionRoute !== 'n/a' && <Pill>{active.productionRoute}</Pill>}
                  {active.inSharedPool && <Pill tone="pool">◇ in pool</Pill>}
                  {evaluateFlag(active).flagged && (
                    <VerifyBadge
                      severity={evaluateFlag(active).severity === 'priority' ? 'priority' : 'watch'}
                    />
                  )}
                </div>
                <div className="mt-3 border-t border-edge pt-3 text-xs">
                  <div className="mb-1 text-mute">Independent estimate</div>
                  <RangeBadge range={active.independentEstimate} confidence={active.estimateConfidence} />
                  <div className="mt-2 text-mute">
                    self-report{' '}
                    <span className="text-text">{NUM(active.selfReported, 2)}</span> · benchmark{' '}
                    <span className="text-text">{NUM(active.benchmark, 2)}</span> tCO₂/t
                  </div>
                  <div className="mt-1 text-mute">
                    imports {NUM(active.annualTonnesImported)} t/yr · match{' '}
                    <span className="text-text">{active.matchConfidence}</span>
                  </div>
                  <div className="mt-2 text-[11px] italic text-mute">{active.matchBasis}</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Synced facility list — the reliable way to reach clustered dots */}
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <span className="text-sm font-semibold text-text">Facilities ({listOrder.length})</span>
            {pinned && (
              <button onClick={() => setPinned(null)} className="text-[11px] text-mute hover:text-text">
                unpin
              </button>
            )}
          </div>
          <div className="max-h-[420px] divide-y divide-edge/50 overflow-y-auto">
            {listOrder.map((s) => {
              const flag = evaluateFlag(s)
              const fill = colorFor(verifiedIntensity(s) / s.benchmark)
              const isActive = active?.id === s.id
              const isPinned = pinned?.id === s.id
              return (
                <button
                  key={s.id}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setPinned(isPinned ? null : s)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-left transition ${
                    isActive ? 'bg-brand/10' : 'hover:bg-panel2'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/40"
                    style={{ backgroundColor: fill }}
                  />
                  <FlagEmoji code={s.countryCode} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-text">{s.name}</span>
                    <span className="block text-[10px] text-mute">
                      {s.country} · {NUM(s.annualTonnesImported)} t/yr
                    </span>
                  </span>
                  {flag.flagged && <span className="shrink-0 text-warn" title="verify-priority">⚑</span>}
                  {isPinned && <span className="shrink-0 text-[10px] text-brand">pinned</span>}
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <p className="text-xs text-mute">
        Satellite/modeled layers resolve to regional plumes and activity proxies,
        not a single facility's CO₂. Positions are illustrative. Hover a row or dot
        to preview; click to pin.
      </p>
    </div>
  )
}
