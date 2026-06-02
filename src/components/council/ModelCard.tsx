import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Clock } from 'lucide-react'
import { GlassCard } from '@/components/primitives'
import { cn } from '@/lib/utils'
import { slotAccent } from './slots'
import type { ModelState } from '@/hooks/useCouncil'

/** Largeurs des lignes du skeleton — variées pour un rythme naturel. */
const SKELETON_WIDTHS = ['92%', '98%', '85%', '70%', '90%', '55%'] as const

/** Au-delà de ce délai sans premier token, on rassure (modèles :free lents). */
const SLOW_HINT_MS = 6000

function PendingBody({ slow }: { slow: boolean }): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5" aria-hidden="true">
        {SKELETON_WIDTHS.map((w, i) => (
          <span key={i} className="skeleton-line h-3" style={{ width: w }} />
        ))}
      </div>
      {slow && (
        <p className="text-xs leading-relaxed text-text-subtle">
          Les modèles gratuits prennent parfois leur temps — la qualité vaut le détour.
        </p>
      )}
    </div>
  )
}

function fmtLatency(ms?: number): string | null {
  if (ms === undefined) return null
  return `${(ms / 1000).toFixed(1)}s`
}

interface ModelCardProps {
  model: ModelState
  /** Hauteur fixe — empêche tout layout shift quel que soit l'état/longueur. */
  className?: string
}

function StatusBadge({ model, accent }: { model: ModelState; accent: string }): ReactNode {
  const latency = fmtLatency(model.latencyMs)
  switch (model.phase) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-subtle">
          <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
          <span className="thinking-dot" style={{ animationDelay: '160ms' }} />
          <span className="thinking-dot" style={{ animationDelay: '320ms' }} />
        </span>
      )
    case 'streaming':
      return (
        <span className="font-mono text-xs tracking-wide" style={{ color: accent }}>
          en cours
        </span>
      )
    case 'complete':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-subtle">
          <Check aria-hidden="true" className="size-3.5 text-consensus" />
          {latency}
        </span>
      )
    case 'timeout':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-subtle">
          <Clock aria-hidden="true" className="size-3.5 text-partial" />
          délai dépassé
        </span>
      )
    case 'error':
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-subtle">
          <AlertTriangle aria-hidden="true" className="size-3.5 text-dissent" />
          indisponible
        </span>
      )
  }
}

function ModelCardImpl({ model, className }: ModelCardProps): ReactNode {
  const accent = slotAccent(model.slot)
  const bodyRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const [slow, setSlow] = useState(false)

  // Auto-scroll « collé en bas » tant que l'utilisateur n'a pas remonté.
  useEffect(() => {
    const el = bodyRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [model.content, model.phase])

  // Dégradation élégante : si le 1er token tarde, on rassure plutôt que d'angoisser.
  useEffect(() => {
    if (model.phase !== 'pending') return
    const id = setTimeout(() => setSlow(true), SLOW_HINT_MS)
    return () => clearTimeout(id)
  }, [model.phase])

  const onScroll = () => {
    const el = bodyRef.current
    if (!el) return
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28
  }

  const failed = model.phase === 'error' || model.phase === 'timeout'

  return (
    <GlassCard
      className={cn('relative flex h-full min-h-0 flex-col overflow-hidden p-0', className)}
      aria-busy={model.phase === 'pending' || model.phase === 'streaming'}
    >
      {/* Liseré supérieur — signature de teinte du délégué */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.55 }}
      />

      {/* En-tête : identité du modèle + statut */}
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
          />
          <span className="truncate font-mono text-sm text-text" title={model.modelId}>
            {model.label}
          </span>
        </div>
        <StatusBadge model={model} accent={accent} />
      </header>

      {/* Corps : réponse streamée, scroll interne propre à la carte */}
      <div
        ref={bodyRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
      >
        {failed ? (
          <p className="text-sm leading-relaxed text-text-muted">
            {model.error ?? 'Ce modèle n’a pas pu répondre. L’assemblée poursuit avec les autres.'}
          </p>
        ) : model.content.length === 0 ? (
          <PendingBody slow={slow} />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-text">
            {model.content}
            {model.phase === 'streaming' && <span aria-hidden="true" className="stream-caret" />}
          </p>
        )}
      </div>
    </GlassCard>
  )
}

/**
 * Mémoïsé : le hook conserve l'identité d'objet des slots inchangés à chaque
 * frame de drain, donc seules les cartes réellement mises à jour re-rendent.
 */
export const ModelCard = memo(ModelCardImpl)
