import { type ReactNode } from 'react'
import { Flame } from 'lucide-react'
import type { Streak } from '@/lib/daily'

/**
 * Compteur de streak — ÉTHIQUE par conception (SPEC §5).
 *
 * Aucune culpabilisation : pas de rouge « streak brisé », pas de compte à
 * rebours anxiogène, pas de menace. Juste une reconnaissance chaleureuse et
 * discrète d'une habitude. Le record personnel est rappelé en encouragement,
 * jamais comme une pression.
 */

interface StreakBadgeProps {
  streak: Streak
  /** Variante compacte (en-tête) ou expansée (panneau de résultat). */
  variant?: 'inline' | 'panel'
}

function encouragement(current: number): string {
  if (current <= 1) return 'Premier jour — ravi de vous voir.'
  if (current < 4) return 'Belle régularité.'
  if (current < 8) return 'Une vraie habitude se dessine.'
  if (current < 21) return 'Fidèle au rendez-vous.'
  return 'Pilier de l’assemblée.'
}

export function StreakBadge({ streak, variant = 'inline' }: StreakBadgeProps): ReactNode {
  const { current, longest } = streak
  const dayWord = current > 1 ? 'jours' : 'jour'

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-dim/40 px-3 py-1 text-sm text-text">
        <Flame aria-hidden="true" className="size-3.5 text-gold" />
        <span className="font-medium">{current}</span>
        <span className="text-text-muted">{dayWord} d’affilée</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold-dim/30 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-dim">
        <Flame aria-hidden="true" className="size-5 text-gold" />
      </span>
      <div className="flex flex-col">
        <span className="text-text">
          <span className="font-display text-2xl leading-none text-text">{current}</span>{' '}
          <span className="text-sm text-text-muted">{dayWord} consécutifs</span>
        </span>
        <span className="text-xs text-text-subtle">
          {encouragement(current)}
          {longest > current && ` · record personnel : ${longest} jours`}
        </span>
      </div>
    </div>
  )
}
