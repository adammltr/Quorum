import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, KeyRound, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/primitives'
import type { QuotaInfo } from '@/hooks/useCouncil'

interface QuotaExceededProps {
  quota: QuotaInfo | null
  /** Plafond de repli si le serveur n'a pas renvoyé la limite (selon le statut). */
  fallbackLimit: number
  /** Ouvre le paywall sur l'accroche BYOK (clé perso → questions illimitées). */
  onByok: () => void
  /** Réinitialise l'UI (retour à l'état initial — « revenir demain »). */
  onReset: () => void
}

/** Millisecondes jusqu'au prochain minuit LOCAL (reset perçu du quota). */
function msUntilLocalMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

/** Formate une durée (ms) en `HH:MM:SS`. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * État « quota atteint » — page centrée, calme, sans skeletons d'IA.
 *
 * Montre le décompte jusqu'à la remise à zéro (minuit local), le quota consommé,
 * et deux issues : passer en BYOK (clé perso, illimité) ou revenir demain.
 */
export function QuotaExceeded({
  quota,
  fallbackLimit,
  onByok,
  onReset,
}: QuotaExceededProps): ReactNode {
  const { t } = useTranslation()
  const [remainingMs, setRemainingMs] = useState<number>(() => msUntilLocalMidnight())

  useEffect(() => {
    const id = window.setInterval(() => setRemainingMs(msUntilLocalMidnight()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const limit = quota?.limit ?? fallbackLimit
  const remaining = quota?.remaining ?? 0

  return (
    <FadeIn>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 py-16 text-center lg:py-24">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-dim/40">
          <CalendarClock aria-hidden="true" className="size-8 text-gold" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="font-display text-3xl leading-tight text-text sm:text-4xl">
            {t('quota.title')}
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-text-muted">
            {t('quota.body')}
          </p>
        </div>

        {/* Compte à rebours jusqu'au reset (minuit local) */}
        <div className="flex flex-col items-center gap-2" role="timer" aria-live="off">
          <span className="font-mono text-xs tracking-wider text-text-subtle uppercase">
            {t('quota.resetIn')}
          </span>
          <span className="font-mono text-4xl tabular-nums text-text" aria-label={t('quota.resetAria')}>
            {formatCountdown(remainingMs)}
          </span>
          <span className="rounded-full bg-surface-raised px-3 py-1 font-mono text-sm text-text-muted">
            {t('quota.remaining', { count: remaining, remaining, limit })}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={onByok}
            className="bg-gold text-[oklch(18%_0.03_70)] hover:bg-gold/90"
          >
            <KeyRound aria-hidden="true" />
            {t('quota.goByok')}
          </Button>
          <Button variant="outline" size="lg" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            {t('quota.comeBackTomorrow')}
          </Button>
        </div>
      </div>
    </FadeIn>
  )
}
