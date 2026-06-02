import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Archive, BellRing, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'
import { ease } from '@/lib/motion'
import { StreakBadge } from './StreakBadge'
import { DailyShareCard } from './DailyShareCard'
import { downloadDailyReminder, type DailyResult } from '@/lib/daily'

/**
 * Panneau de fin de QdJ — comparaison sociale légère (SPEC §5).
 *
 * On situe le council de l'utilisateur par rapport au consensus mondial du
 * jour, on célèbre le streak (sans pression), on offre la carte de partage
 * Wordle et un rappel opt-in honnête (.ics). Tonalité : reconnaissance, jamais
 * compétition agressive.
 */

interface DailyResultPanelProps {
  result: DailyResult
  slots: string[]
  borda: Record<string, number> | null
}

/** Barre de consensus comparée, animée à l'entrée. */
function ConsensusBar({
  label,
  value,
  accent,
}: {
  label: string
  value: number | null
  accent: 'gold' | 'muted'
}): ReactNode {
  const reduced = useReducedMotion()
  const pct = value ?? 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="font-mono text-sm text-text">{value !== null ? `${value}%` : '—'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
        <motion.div
          className={accent === 'gold' ? 'h-full rounded-full bg-gold' : 'h-full rounded-full bg-text-subtle'}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ...ease, duration: 0.8 }}
        />
      </div>
    </div>
  )
}

/** Phrase de comparaison sociale, honnête et non culpabilisante. */
function socialLine(result: DailyResult): string | null {
  if (result.percentile !== null && result.participantCount > 1) {
    return `Ton assemblée a trouvé plus d’accord que ${result.percentile}% des participants du jour.`
  }
  if (result.agreementRate !== null && result.participantCount > 1) {
    return `${result.agreementRate}% des participants ont atteint un consensus aujourd’hui.`
  }
  return null
}

export function DailyResultPanel({ result, slots, borda }: DailyResultPanelProps): ReactNode {
  const reduced = useReducedMotion()
  const [reminderSet, setReminderSet] = useState(false)
  const line = socialLine(result)

  const handleReminder = (): void => {
    downloadDailyReminder(9)
    setReminderSet(true)
    track('daily_reminder_optin', {})
  }

  return (
    <motion.section
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface-raised/60 p-6 backdrop-blur-sm"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ease}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-text">Votre verdict du jour</h2>
        <StreakBadge streak={result.streak} variant="inline" />
      </div>

      {/* Comparaison au consensus mondial du jour */}
      <div className="flex flex-col gap-3">
        <ConsensusBar label="Votre assemblée" value={result.yourScore} accent="gold" />
        <ConsensusBar
          label="Consensus mondial du jour"
          value={result.aggregateConsensus}
          accent="muted"
        />
      </div>

      {line && (
        <div className="flex items-start gap-2 text-sm text-text-muted">
          <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
          <p>{line}</p>
        </div>
      )}
      {result.participantCount > 0 && (
        <p className="text-xs text-text-subtle">
          {result.participantCount.toLocaleString('fr-FR')}{' '}
          {result.participantCount > 1 ? 'assemblées convoquées' : 'assemblée convoquée'} aujourd’hui.
        </p>
      )}

      {/* Streak — reconnaissance détaillée */}
      <StreakBadge streak={result.streak} variant="panel" />

      {/* Partage Wordle */}
      <DailyShareCard result={result} slots={slots} borda={borda} />

      {/* Rappel opt-in éthique + archive */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {reminderSet ? (
          <span className="inline-flex items-center gap-2 text-sm text-text-muted">
            <Check aria-hidden="true" className="size-4 text-consensus" />
            Rappel ajouté à votre agenda.
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleReminder}>
            <BellRing aria-hidden="true" />
            Me le rappeler chaque jour
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/jour/archive">
            <Archive aria-hidden="true" />
            Questions passées
          </Link>
        </Button>
      </div>
    </motion.section>
  )
}
