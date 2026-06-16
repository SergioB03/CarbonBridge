import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Material } from '../lib/material'

// CarbonBridge — shared app state.
// - mode: 'operator' (the importer's working app, clean) vs 'pitch' (shows the
//   judge-facing methodology / "why this matters" framing).
// - material: the global material lens (all / steel / aluminium / cement) that
//   scopes EVERY screen at once — the importer's primary way to navigate.
// - view: which screen is active (lifted here so any view can navigate).
// - verifyStatus: per-supplier verification workflow, shared between the
//   Suppliers tracker and the Overview worklist.

export type Mode = 'operator' | 'pitch'
export type VerifyStatus = 'none' | 'requested' | 'received'

interface AppState {
  mode: Mode
  setMode: (m: Mode) => void
  material: Material
  setMaterial: (m: Material) => void
  view: string
  setView: (v: string) => void
  verifyStatus: Record<string, VerifyStatus>
  statusOf: (id: string) => VerifyStatus
  requestVerification: (id: string) => void
  markReceived: (id: string) => void
  resetVerification: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('operator')
  const [material, setMaterial] = useState<Material>('all')
  const [view, setView] = useState('overview')
  const [verifyStatus, setVerify] = useState<Record<string, VerifyStatus>>({})

  const statusOf = (id: string): VerifyStatus => verifyStatus[id] ?? 'none'
  const requestVerification = (id: string) =>
    setVerify((p) => (p[id] === 'received' ? p : { ...p, [id]: 'requested' }))
  const markReceived = (id: string) => setVerify((p) => ({ ...p, [id]: 'received' }))
  const resetVerification = () => setVerify({})

  return (
    <Ctx.Provider
      value={{
        mode,
        setMode,
        material,
        setMaterial,
        view,
        setView,
        verifyStatus,
        statusOf,
        requestVerification,
        markReceived,
        resetVerification,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAppState(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppState must be used within AppStateProvider')
  return v
}

export const useMode = () => useAppState().mode
