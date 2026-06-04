import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Users } from 'lucide-react'
import { AppShell } from '@/components/account/AppShell'
import { Button } from '@/components/ui/button'
import { DailyGate } from '@/components/daily/DailyGate'
import { useAuth } from '@/components/auth/use-auth'
import {
  listDailyArchive,
  dailyPath,
  formatDayFr,
  todayUtc,
  type DailyArchiveEntry,
} from '@/lib/daily'

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; entries: DailyArchiveEntry[] }
  | { kind: 'error'; message: string }

/**
 * Archive consultable des Questions du Jour (SPEC §5).
 *
 * Chaque entrée est une page indexable (bon pour le SEO) : on liste les QdJ
 * passées avec leur consensus mondial et leur affluence, lien vers le rendez-
 * vous de ce jour-là.
 */
export function DailyArchive(): ReactNode {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [gateOpen, setGateOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const today = todayUtc()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const entries = await listDailyArchive(120)
        if (!cancelled) setLoad({ kind: 'ready', entries })
      } catch (err) {
        if (!cancelled) {
          setLoad({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Archive indisponible.',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppShell
      title="Questions du Jour"
      subtitle="Chaque jour, une question unique soumise à l’assemblée. Revisitez les délibérations passées et leur consensus mondial."
      action={
        <Button asChild>
          <Link to="/jour">
            <CalendarDays aria-hidden="true" />
            Question d’aujourd’hui
          </Link>
        </Button>
      }
    >
      {load.kind === 'loading' && (
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-xl bg-surface-raised/60" />
          ))}
        </ul>
      )}

      {load.kind === 'error' && (
        <p role="alert" className="text-sm text-dissent">
          {load.message}
        </p>
      )}

      {load.kind === 'ready' && load.entries.length === 0 && (
        <p className="text-text-muted">L’archive se remplira au fil des jours.</p>
      )}

      {load.kind === 'ready' && load.entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {load.entries.map((e) => {
            // Délibérations passées réservées aux comptes (la QdJ du jour reste libre).
            const gated = !isAuthenticated && e.day !== today
            return (
            <li key={e.day}>
              <Link
                to={dailyPath(e.day)}
                onClick={(ev) => {
                  if (gated) {
                    ev.preventDefault()
                    setGateOpen(true)
                  }
                }}
                className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-raised/50 px-5 py-4 transition-colors hover:border-border-bright hover:bg-surface-raised"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex items-center gap-2 font-mono text-xs tracking-wide text-text-subtle uppercase">
                    {formatDayFr(e.day)}
                    {e.day === today && (
                      <span className="rounded-full bg-gold-dim px-1.5 py-0.5 text-[0.65rem] text-gold">
                        aujourd’hui
                      </span>
                    )}
                  </span>
                  <p className="line-clamp-2 font-display text-lg leading-snug text-text">
                    {e.question}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    {e.aggregateConsensus !== null && (
                      <span className="font-mono">{e.aggregateConsensus}% de consensus</span>
                    )}
                    {e.participantCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users aria-hidden="true" className="size-3.5" />
                        {e.participantCount.toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text"
                />
              </Link>
            </li>
            )
          })}
        </ul>
      )}

      <DailyGate open={gateOpen} onOpenChange={setGateOpen} />
    </AppShell>
  )
}
