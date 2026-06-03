import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/components/auth/use-auth'
import { fetchTodayUsage } from '@/lib/account'
import { FREE_TIER } from '@/config/billing'

interface QuotaCounterProps {
  /**
   * Change à chaque nouvelle question soumise : force le rafraîchissement du
   * compteur après une délibération (le serveur a incrémenté le quota).
   */
  refreshKey: number
}

/**
 * Compteur discret « X questions restantes aujourd'hui » près du composer.
 *
 * Affiché UNIQUEMENT pour un compte connecté non-PRO (les anonymes n'ont pas
 * forcément de profil exposé ; les PRO sont illimités → rien à montrer). Lecture
 * seule via `fetchTodayUsage` — n'incrémente jamais le quota.
 */
export function QuotaCounter({ refreshKey }: QuotaCounterProps): ReactNode {
  const { isAuthenticated, isPro, configured } = useAuth()
  const [count, setCount] = useState<number | null>(null)

  const enabled = configured && isAuthenticated && !isPro

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        const used = await fetchTodayUsage()
        if (!cancelled) setCount(used)
      } catch {
        if (!cancelled) setCount(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, refreshKey])

  if (!enabled || count === null) return null

  const limit = FREE_TIER.dailyQuestionsAccount
  const remaining = Math.max(0, limit - count)

  return (
    <span className="rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-xs text-text-muted">
      {remaining} question{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} aujourd’hui
    </span>
  )
}
