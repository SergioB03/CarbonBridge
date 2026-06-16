import { IMPORTER } from './data/suppliers'
import { useAppState } from './state/appState'
import { MATERIALS } from './lib/material'
import Overview from './views/Overview'
import Suppliers from './views/Suppliers'
import Simulator from './views/Simulator'
import Evidence from './views/Evidence'
import Copilot from './components/Copilot'

const NAV: { id: string; label: string; icon: string; hint: string }[] = [
  { id: 'overview', label: 'Overview', icon: '▦', hint: 'Cost, to-dos & where it sits' },
  { id: 'suppliers', label: 'Suppliers', icon: '◷', hint: 'Verify first & track requests' },
  { id: 'simulator', label: 'Simulator', icon: '∿', hint: 'What-if decarbonisation payoff' },
  { id: 'evidence', label: 'Evidence', icon: '▤', hint: 'Real measured data & live feeds' },
]

const VIEWS: Record<string, () => JSX.Element> = {
  overview: Overview,
  suppliers: Suppliers,
  simulator: Simulator,
  evidence: Evidence,
}

export default function App() {
  const { view, setView, mode, setMode, material, setMaterial } = useAppState()
  const Active = VIEWS[view] ?? Overview

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
            <div className="text-[11px] text-mute">CBAM workspace</div>
          </div>
        </div>

        {/* Global material lens — the importer's primary filter */}
        <div className="px-3 pb-2">
          <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-mute">
            Material
          </div>
          <div className="grid grid-cols-2 gap-1">
            {MATERIALS.map((m) => {
              const active = m.id === material
              return (
                <button
                  key={m.id}
                  onClick={() => setMaterial(m.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-brand/40 bg-brand/10 text-brand'
                      : 'border-edge text-mute hover:bg-panel2 hover:text-text'
                  }`}
                >
                  <span className={active ? 'text-brand' : ''}>{m.icon}</span>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        <nav className="mt-1 flex-1 space-y-1 overflow-y-auto border-t border-edge px-3 pt-3">
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
                <span className={`mt-0.5 text-base ${active ? 'text-brand' : ''}`}>{n.icon}</span>
                <span>
                  <span className="block text-sm font-medium">{n.label}</span>
                  <span className="block text-[11px] leading-tight text-mute">{n.hint}</span>
                </span>
              </button>
            )
          })}
        </nav>

        {/* View-mode toggle */}
        <div className="px-3 pb-2 pt-2">
          <div className="flex rounded-xl border border-edge bg-panel2 p-1 text-xs">
            {(['operator', 'pitch'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-2 py-1.5 font-medium capitalize transition ${
                  mode === m ? 'bg-brand/15 text-brand' : 'text-mute hover:text-text'
                }`}
              >
                {m === 'pitch' ? 'Pitch / judge' : 'Operator'}
              </button>
            ))}
          </div>
          <div className="mt-1 px-1 text-[10px] text-mute">
            {mode === 'operator' ? 'Clean importer view' : 'Shows methodology, sources & framing'}
          </div>
        </div>

        <div className="border-t border-edge px-5 py-3 text-[11px] text-mute">
          <div className="font-medium text-text">{IMPORTER.name}</div>
          <div>{IMPORTER.country} · EORI {IMPORTER.eori}</div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1180px] px-8 py-8">
          <Active />
        </div>
      </main>

      <Copilot />
    </div>
  )
}
