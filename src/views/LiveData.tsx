import { useEffect, useState } from 'react'
import {
  fetchGridIntensity,
  fetchGenerationMix,
  searchLei,
  nameSimilarity,
  similarityLabel,
  type GridIntensity,
  type FuelShare,
  type LeiMatch,
} from '../lib/liveData'
import { Card, SectionTitle, Pill, ConfidenceChip } from '../components/ui'

// Real company names that actually resolve in GLEIF (our mock supplier names are
// fictional traders, so we seed the demo with real producers to show live hits).
const SAMPLE_QUERIES = ['Tata Steel', 'POSCO', 'ArcelorMittal', 'Hindalco', 'Nucor']

const INDEX_TONE: Record<string, { color: string; label: string }> = {
  'very low': { color: '#34d399', label: 'very low' },
  low: { color: '#34d399', label: 'low' },
  moderate: { color: '#f59e0b', label: 'moderate' },
  high: { color: '#f87171', label: 'high' },
  'very high': { color: '#f87171', label: 'very high' },
}

const FUEL_COLOR: Record<string, string> = {
  wind: '#34d399',
  solar: '#facc15',
  hydro: '#38bdf8',
  nuclear: '#818cf8',
  biomass: '#a3e635',
  gas: '#f97316',
  coal: '#ef4444',
  imports: '#60a5fa',
  other: '#7d8aa5',
}
const CLEAN = new Set(['wind', 'solar', 'hydro', 'nuclear', 'biomass'])

function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
    </span>
  )
}

function GridPanel() {
  const [intensity, setIntensity] = useState<GridIntensity | null>(null)
  const [mix, setMix] = useState<FuelShare[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [i, m] = await Promise.all([fetchGridIntensity(), fetchGenerationMix()])
      setIntensity(i)
      setMix([...m.mix].sort((a, b) => b.perc - a.perc))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Live source unreachable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const tone = intensity ? INDEX_TONE[intensity.index] ?? INDEX_TONE.moderate : null
  const cleanPct = mix
    .filter((f) => CLEAN.has(f.fuel))
    .reduce((a, f) => a + f.perc, 0)

  return (
    <Card>
      <SectionTitle
        kicker="Live · UK Carbon Intensity API"
        title="Great Britain grid carbon intensity"
        right={
          <button
            onClick={load}
            className="rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-xs text-mute hover:text-text"
          >
            ↻ Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}. The rest of the app runs on mock data and is unaffected.
        </div>
      )}

      {loading && !intensity && (
        <div className="animate-pulse text-sm text-mute">Fetching live grid data…</div>
      )}

      {intensity && tone && (
        <>
          <div className="flex items-end gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-mute">
                <LiveDot /> live now
              </div>
              <div className="stat-num text-4xl font-bold" style={{ color: tone.color }}>
                {intensity.actual ?? intensity.forecast}
                <span className="ml-1 text-base font-normal text-mute">gCO₂/kWh</span>
              </div>
            </div>
            <span
              className="chip mb-2"
              style={{ borderColor: tone.color, color: tone.color }}
            >
              {tone.label}
            </span>
            <div className="mb-1 ml-auto text-right text-xs text-mute">
              clean share
              <div className="stat-num text-lg font-semibold text-brand">
                {cleanPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Stacked generation mix */}
          <div className="mt-4">
            <div className="mb-1 text-xs text-mute">Generation mix (live)</div>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {mix.map((f) => (
                <div
                  key={f.fuel}
                  style={{ width: `${f.perc}%`, backgroundColor: FUEL_COLOR[f.fuel] ?? '#7d8aa5' }}
                  title={`${f.fuel} ${f.perc}%`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-mute">
              {mix
                .filter((f) => f.perc > 0)
                .map((f) => (
                  <span key={f.fuel} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-sm"
                      style={{ backgroundColor: FUEL_COLOR[f.fuel] ?? '#7d8aa5' }}
                    />
                    {f.fuel} {f.perc}%
                  </span>
                ))}
            </div>
          </div>

          <p className="mt-4 rounded-lg bg-panel2 p-3 text-xs text-mute">
            <span className="font-medium text-text">Honest scope:</span> this is live{' '}
            <span className="text-text">Great Britain</span> grid data — a real proof
            of the pipeline, not a stand-in for a Chinese or Indian smelter's grid. In
            production we'd use <span className="text-text">average</span> country
            intensity (Ember) for the declaration math and{' '}
            <span className="text-text">marginal</span> intensity (WattTime) for the
            "what if they switched to cleaner power?" simulator.
          </p>
        </>
      )}
    </Card>
  )
}

function LeiPanel() {
  const [query, setQuery] = useState('Tata Steel')
  const [results, setResults] = useState<LeiMatch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const run = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      setResults(await searchLei(q))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Live source unreachable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run('Tata Steel')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card>
      <SectionTitle
        kicker="Live · GLEIF LEI API"
        title="Entity resolution — match a named supplier to a legal entity"
        sub="Type a producer name; we query GLEIF's global LEI registry live and score each match. Production keeps a manual-confirm step — we never auto-resolve."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(query)
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Tata Steel"
          className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-text placeholder:text-mute"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand/15 px-4 py-2 text-sm font-medium text-brand ring-1 ring-brand/30 hover:bg-brand/20"
        >
          Search
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuery(q)
              run(q)
            }}
            className="chip border-edge text-mute hover:text-text"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loading && <div className="animate-pulse text-sm text-mute">Querying GLEIF…</div>}
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error}.
          </div>
        )}
        {!loading && !error && searched && results.length === 0 && (
          <div className="text-sm text-mute">
            No LEI records matched. (Many traders/distributors have no LEI — exactly the
            gap that keeps the facility join manual.)
          </div>
        )}

        {results.map((r) => {
          const score = nameSimilarity(query, r.name)
          const active = r.status === 'ACTIVE' && r.registrationStatus === 'ISSUED'
          return (
            <div
              key={r.lei}
              className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-panel2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-text">{r.name}</span>
                  {active ? (
                    <Pill tone="good">active</Pill>
                  ) : (
                    <Pill tone="warn">{r.status.toLowerCase()}</Pill>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-mute">
                  <span className="stat-num">{r.lei}</span>
                  <span>· {r.city ? `${r.city}, ` : ''}{r.country}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <ConfidenceChip level={similarityLabel(score)} />
                <div className="mt-1 text-[11px] text-mute">
                  match {Math.round(score * 100)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 rounded-lg bg-panel2 p-3 text-xs text-mute">
        <span className="font-medium text-text">Honest scope:</span> LEI anchors the
        importer/company side. But{' '}
        <span className="text-text">Climate TRACE facilities carry no LEI</span>, so
        matching a company to a specific mill stays semi-manual — which is why every
        match shows a confidence score and a human confirms it.
      </p>
    </Card>
  )
}

export default function LiveData() {
  return (
    <div className="space-y-6">
      <SectionTitle
        kicker="Live integrations"
        title="Real data, wired in"
        sub="Two of the production sources are genuinely live here (no API keys, no backend). Everything else in CarbonBridge is mock — these prove the pipeline is real, not hand-waved."
        right={
          <span className="chip border-brand/40 text-brand">
            <LiveDot /> &nbsp;live feeds
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GridPanel />
        <LeiPanel />
      </div>
    </div>
  )
}
