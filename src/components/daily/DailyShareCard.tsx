import { useState, type ReactNode } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'
import {
  buildEmojiGrid,
  canNativeShare,
  copyToClipboard,
  nativeShare,
  xIntentUrl,
} from '@/lib/share'
import { TIER_COLOR, tierForRank } from '@/components/council/slots'
import {
  buildDailyShareText,
  dailyUrl,
  formatDayShort,
  type DailyResult,
} from '@/lib/daily'

/**
 * Carte de partage façon Wordle (SPEC §5) — le mécanisme viral + rétention.
 *
 * Visuel compact et reconnaissable : la date, une grille d'emoji encodant
 * l'accord/désaccord des modèles (vert = consensus, ambre = partiel, orange =
 * divergence) et le score. Spoiler-free : on intrigue sans révéler le verdict.
 */

interface DailyShareCardProps {
  result: DailyResult
  /** Slots dans l'ordre d'affichage (A, B, C, D…). */
  slots: string[]
  borda: Record<string, number> | null
}

export function DailyShareCard({ result, slots, borda }: DailyShareCardProps): ReactNode {
  const [copied, setCopied] = useState(false)
  // La grille d'emoji reste dans le TEXTE partagé (rendu fiable sur X/réseaux).
  const grid = buildEmojiGrid(slots, borda)
  const text = buildDailyShareText({
    day: result.day,
    grid,
    consensusScore: result.yourScore,
  })
  const url = dailyUrl(result.day)

  // Pour l'affichage à l'écran, on rend des points colorés CSS (tokens du design
  // system) plutôt que des emojis : zéro « ◇? » selon la plateforme/police.
  const ranked = borda
    ? Object.entries(borda)
        .sort((a, b) => b[1] - a[1])
        .map(([s]) => s)
    : []
  const dots = slots.map((slot) => {
    const rank = ranked.indexOf(slot)
    return rank !== -1 ? TIER_COLOR[tierForRank(rank, ranked.length)] : 'var(--text-subtle)'
  })

  const handleCopy = async (): Promise<void> => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      track('daily_share_copied', { day: result.day })
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNative = async (): Promise<void> => {
    const ok = await nativeShare({ title: 'Quorum — Question du Jour', text, url })
    if (ok) track('daily_share_channel', { channel: 'native' })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* La carte partageable */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-surface p-6 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-56 -translate-x-1/2 rounded-full bg-gold-dim blur-3xl opacity-70"
        />
        <div className="relative flex flex-col items-center gap-3">
          <span className="font-mono text-xs tracking-wider text-gold uppercase">
            Quorum du {formatDayShort(result.day)}
          </span>
          <div
            className="flex items-center gap-2.5"
            role="img"
            aria-label={`Accord des modèles, du plus fort au plus divergent (${dots.length} délégués)`}
          >
            {dots.map((color, i) => (
              <span
                key={i}
                className="size-3.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 0 1px ${color} inset` }}
              />
            ))}
          </div>
          {result.yourScore !== null && (
            <span className="font-mono text-sm text-text-muted">
              <span className="text-2xl text-text">{result.yourScore}</span>% de consensus
            </span>
          )}
          {/* Spoiler-free : les points encodent l'accord, jamais le verdict. */}
          <p className="text-xs text-text-subtle italic">
            Chaque point représente l’accord d’un modèle — le verdict reste masqué pour ne pas
            spoiler les autres.
          </p>
        </div>
      </div>

      {/* Diffusion */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check aria-hidden="true" className="text-consensus" />
              Copié
            </>
          ) : (
            <>
              <Copy aria-hidden="true" />
              Copier le résultat
            </>
          )}
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a
            href={xIntentUrl(text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('daily_share_channel', { channel: 'x' })}
          >
            Partager sur X
          </a>
        </Button>
        {canNativeShare() && (
          <Button variant="secondary" size="sm" onClick={handleNative}>
            <Share2 aria-hidden="true" />
            Plus…
          </Button>
        )}
      </div>
    </div>
  )
}
