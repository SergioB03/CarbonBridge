import type { ReactNode } from 'react'
import type { Confidence, EstimateRange } from '../types'

// CarbonBridge — shared UI primitives. Views compose these so the look stays
// consistent and the legally-important affordances (ranges + confidence) are
// rendered the same way everywhere.

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function SectionTitle({
  kicker,
  title,
  sub,
  right,
}: {
  kicker?: string
  title: string
  sub?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {kicker && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">
            {kicker}
          </div>
        )}
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-sm text-mute">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/**
 * Pitch / judge-mode callout. Rendered prominently at the top of each view when
 * `mode === 'pitch'`, so flipping the sidebar toggle produces an immediate,
 * above-the-fold change with the methodology / sources / framing a judge wants.
 */
export function PitchNote({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="card border-l-4 border-l-accent bg-accent/[0.06] p-4">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="chip border-accent/40 bg-accent/10 text-accent">◉ Pitch / judge view</span>
        <span className="text-sm font-semibold text-text">{title}</span>
      </div>
      <div className="text-sm leading-relaxed text-mute [&_strong]:font-medium [&_strong]:text-text">
        {children}
      </div>
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'danger' | 'accent'
}) {
  const toneClass = {
    default: 'text-text',
    good: 'text-brand',
    warn: 'text-warn',
    danger: 'text-danger',
    accent: 'text-accent',
  }[tone]
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-mute">
        {label}
      </div>
      <div className={`stat-num mt-1 text-2xl font-semibold ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-mute">{sub}</div>}
    </div>
  )
}

const CONF_STYLE: Record<Confidence, string> = {
  low: 'border-edge text-mute',
  medium: 'border-warn/40 text-warn',
  high: 'border-brand/40 text-brand',
}

export function ConfidenceChip({ level }: { level: Confidence }) {
  return (
    <span className={`chip ${CONF_STYLE[level]}`} title="Confidence in the independent estimate">
      <span className="opacity-70">●</span> {level} confidence
    </span>
  )
}

/**
 * The single most important UI affordance in the product: an independent
 * estimate is ALWAYS shown as a range + confidence label, never a hard number.
 */
export function RangeBadge({
  range,
  confidence,
  unit = 'tCO₂/t',
}: {
  range: EstimateRange
  confidence: Confidence
  unit?: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="stat-num text-sm text-text">
        {range.low}–{range.high}{' '}
        <span className="text-mute">{unit}</span>
      </span>
      <ConfidenceChip level={confidence} />
    </span>
  )
}

export function Pill({
  children,
  tone = 'default',
  title,
}: {
  children: ReactNode
  tone?: 'default' | 'good' | 'warn' | 'danger' | 'accent' | 'pool'
  title?: string
}) {
  const tones = {
    default: 'border-edge text-mute',
    good: 'border-brand/40 text-brand bg-brand/5',
    warn: 'border-warn/40 text-warn bg-warn/5',
    danger: 'border-danger/40 text-danger bg-danger/5',
    accent: 'border-accent/40 text-accent bg-accent/5',
    pool: 'border-accent/40 text-accent bg-accent/5',
  }[tone]
  return (
    <span className={`chip ${tones}`} title={title}>
      {children}
    </span>
  )
}

/** Importer-only triage badge. Deliberately worded as a recommendation. */
export function VerifyBadge({ severity }: { severity: 'watch' | 'priority' }) {
  const isPriority = severity === 'priority'
  return (
    <span
      className={`chip ${
        isPriority
          ? 'border-warn/50 bg-warn/10 text-warn'
          : 'border-warn/30 bg-warn/5 text-warn/90'
      }`}
      title="Private triage signal — visible only in your importer view. Not a public claim."
    >
      ⚑ Verification {isPriority ? 'Priority' : 'Watch'}
    </span>
  )
}

export function FlagEmoji({ code }: { code: string }) {
  // ISO-2 lowercase -> regional indicator emoji.
  const cc = code.toUpperCase()
  const emoji =
    cc.length === 2
      ? String.fromCodePoint(
          ...[...cc].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)),
        )
      : '🏳️'
  return <span aria-hidden>{emoji}</span>
}
