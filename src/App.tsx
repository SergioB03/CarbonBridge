import { useState } from 'react'
import { IMPORTER } from './data/suppliers'
import Dashboard from './views/Dashboard'
import ComparisonShelf from './views/ComparisonShelf'
import FacilityMap from './views/FacilityMap'
import VerificationFlag from './views/VerificationFlag'
import Simulator from './views/Simulator'
import LiveData from './views/LiveData'

type ViewId = 'dashboard' | 'shelf' | 'map' | 'verify' | 'simulator' | 'live'

const NAV: { id: ViewId; label: string; icon: string; hint: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', hint: 'Accruing liability & avoidable overpayment' },
  { id: 'shelf', label: 'Comparison shelf', icon: '⋮⋮', hint: 'Rank suppliers by carbon cost' },
  { id: 'map', label: 'Facility map', icon: '◎', hint: 'Emissions intensity & network demand' },
  { id: 'verify', label: 'Verification priority', icon: '⚑', hint: 'Private triage — where to verify first' },
  { id: 'simulator', label: 'Simulator & ledger', icon: '∿', hint: 'What-if decarbonisation payoff' },
  { id: 'live', label: 'Live data', icon: '◉', hint: 'Real grid + company-ID feeds' },
]

const VIEWS: Record<ViewId, () => JSX.Element> = {
  dashboard: Dashboard,
  shelf: ComparisonShelf,
  map: FacilityMap,
  verify: VerificationFlag,
  simulator: Simulator,
  live: LiveData,
}

export default function App() {
  const [view, setView] = useState<ViewId>('dashboard')
  const Active = VIEWS[view]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-edge bg-panel/60 backdrop-blur">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-lg text-brand">
            ⬡
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">CarbonBridge</div>
            <div className="text-[11px] text-mute">CBAM verification POC</div>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = n.id === view
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  active
                    ? 'bg-brand/10 text-text ring-1 ring-brand/30'
                    : 'text-mute hover:bg-panel2 hover:text-text'
                }`}
              >
                <span className={`mt-0.5 text-base ${active ? 'text-brand' : ''}`}>
                  {n.icon}
                </span>
                <span>
                  <span className="block text-sm font-medium">{n.label}</span>
                  <span className="block text-[11px] leading-tight text-mute">
                    {n.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-edge px-5 py-4 text-[11px] text-mute">
          <div className="font-medium text-text">{IMPORTER.name}</div>
          <div>{IMPORTER.country} · EORI {IMPORTER.eori}</div>
          <div className="mt-2 rounded-lg bg-panel2 px-2 py-1.5">
            Mock data · POC. Estimates shown as ranges + confidence. The Live
            data tab uses real public feeds.
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1180px] px-8 py-8">
          <Active />
        </div>
      </main>
    </div>
  )
}
