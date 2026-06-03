import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/primitives'
import { ShareDialog } from '@/components/council/ShareDialog'
import { slotAccent, tierForRank } from '@/components/council/slots'
import { AddToCollectionDialog } from './AddToCollectionDialog'
import { useAuth } from '@/components/auth/use-auth'
import type { HistoryItem } from '@/lib/account'
import { cn, daysUntil, formatRelativeDate } from '@/lib/utils'

function scoreColor(score: number): string {
  if (score >= 67) return 'var(--consensus)'
  if (score >= 40) return 'var(--partial)'
  return 'var(--dissent)'
}

interface HistoryCardProps {
  item: HistoryItem
  onRemove: (runId: string) => Promise<void>
  /** Masque l'action « épingler » (ex. à l'intérieur d'une collection). */
  hidePin?: boolean
}

/** Carte d'historique : question, aperçu du verdict, score, métadonnées, actions. */
export function HistoryCard({ item, onRemove, hidePin = false }: HistoryCardProps): ReactNode {
  const { isPro } = useAuth()
  const [pinOpen, setPinOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  const slots = item.council_snapshot.delegates.map((d) => d.slot)
  const borda = item.verdict?.borda_scores ?? null
  const ranked = borda
    ? Object.entries(borda)
        .sort((a, b) => b[1] - a[1])
        .map(([s]) => s)
    : []
  const score = item.verdict?.consensus_score ?? null
  const expiresIn = isPro ? null : daysUntil(item.expires_at)

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await onRemove(item.id)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <GlassCard className="flex flex-col gap-4 p-5 transition-colors hover:border-gold/40">
      {/* Zone cliquable : ouvre le résultat complet (/run/:id). Les actions
          (partager, épingler, supprimer) restent isolées dans la barre du bas. */}
      <Link
        to={`/run/${item.id}`}
        className="flex items-start gap-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        aria-label={`Ouvrir la délibération : ${item.question}`}
      >
        {/* Score de consensus — pastille compacte */}
        {score !== null ? (
          <div
            className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border"
            style={{ borderColor: scoreColor(score), background: 'var(--surface)' }}
            role="img"
            aria-label={`Consensus ${score} sur 100`}
          >
            <span className="font-mono text-xl leading-none tabular-nums" style={{ color: scoreColor(score) }}>
              {score}
            </span>
            <span className="font-mono text-[0.6rem] text-text-subtle">/100</span>
          </div>
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-surface">
            <span className="font-mono text-xs text-text-subtle">—</span>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="line-clamp-2 font-display text-lg leading-snug text-text">{item.question}</h3>
          {item.verdict?.body && (
            <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">{item.verdict.body}</p>
          )}
        </div>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Empreinte de l'assemblée : un point par modèle, teinté par son accord */}
          <div className="flex items-center gap-1" aria-hidden="true">
            {slots.map((slot) => {
              const rank = ranked.indexOf(slot)
              const tinted =
                rank !== -1
                  ? `var(--${tierForRank(rank, ranked.length)})`
                  : slotAccent(slot)
              return <span key={slot} className="size-2 rounded-full" style={{ background: tinted }} />
            })}
          </div>
          <span className="font-mono text-xs text-text-subtle">{formatRelativeDate(item.created_at)}</span>
          {expiresIn !== null && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 font-mono text-[0.64rem]',
                expiresIn <= 2 ? 'bg-dissent-dim text-dissent' : 'bg-surface-raised text-text-subtle',
              )}
              title="Historique gratuit : 7 jours. Passe en PRO pour le conserver."
            >
              {expiresIn <= 0 ? 'expire bientôt' : `expire dans ${expiresIn} j`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!hidePin && (
            <Button variant="ghost" size="sm" onClick={() => setPinOpen(true)}>
              <Bookmark aria-hidden="true" />
              Épingler
            </Button>
          )}
          <ShareDialog
            runId={item.id}
            question={item.question}
            consensusScore={score}
            slots={slots}
            borda={borda}
            variant="inline"
          />
          {confirming ? (
            <span className="flex items-center gap-1">
              <Button variant="destructive" size="sm" disabled={removing} onClick={() => void handleRemove()}>
                Confirmer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Annuler
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Supprimer cette délibération"
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {!hidePin && <AddToCollectionDialog runId={item.id} open={pinOpen} onOpenChange={setPinOpen} />}
    </GlassCard>
  )
}
