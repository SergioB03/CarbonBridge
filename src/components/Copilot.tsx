import { useState } from 'react'

// CarbonBridge — CBAM Copilot UI.
// Talks to a Bedrock-backed Lambda at VITE_COPILOT_URL (see docs/AWS_DEPLOY.md).
// Degrades gracefully when no endpoint is configured so the demo UI still works.

const COPILOT_URL = (import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_COPILOT_URL

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SEED: Msg = {
  role: 'assistant',
  content:
    "I'm the CarbonBridge CBAM copilot. Ask me things like “why is the Chinese mill flagged?”, “what's the default value vs verified gap?”, or “when is the first payment due?”",
}

export default function Copilot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([SEED])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    const next = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(next)
    setInput('')

    if (!COPILOT_URL) {
      setMsgs([
        ...next,
        {
          role: 'assistant',
          content:
            'Copilot endpoint not configured. This is the live UI — wire VITE_COPILOT_URL to the Bedrock Lambda (see docs/AWS_DEPLOY.md) and I’ll answer for real. Everything else in the app already runs on real data.',
        },
      ])
      return
    }

    setBusy(true)
    try {
      const r = await fetch(COPILOT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const d = await r.json()
      setMsgs([...next, { role: 'assistant', content: d.text || d.error || 'No response.' }])
    } catch (e) {
      setMsgs([
        ...next,
        { role: 'assistant', content: `Copilot unreachable: ${e instanceof Error ? e.message : 'error'}.` },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand/90 px-4 py-3 text-sm font-semibold text-ink shadow-card hover:bg-brand"
        title="CBAM copilot (Bedrock)"
      >
        ✦ Copilot
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[460px] w-[360px] flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-card">
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <div className="text-sm font-semibold text-text">CBAM Copilot</div>
            <div className="flex items-center gap-2">
              <span
                className={`chip ${COPILOT_URL ? 'border-brand/40 text-brand' : 'border-edge text-mute'}`}
                title={COPILOT_URL ? 'Bedrock endpoint configured' : 'No endpoint — UI demo only'}
              >
                {COPILOT_URL ? '● Bedrock' : '○ not wired'}
              </span>
              <button onClick={() => setOpen(false)} className="text-mute hover:text-text">
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <span
                  className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-brand/15 text-text' : 'bg-panel2 text-text'
                  }`}
                >
                  {m.content}
                </span>
              </div>
            ))}
            {busy && <div className="text-xs text-mute">thinking…</div>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex gap-2 border-t border-edge p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about CBAM…"
              className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-text placeholder:text-mute"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-brand/15 px-3 py-2 text-sm font-medium text-brand ring-1 ring-brand/30 hover:bg-brand/20 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
