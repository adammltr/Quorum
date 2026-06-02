import { type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { GlassCard } from '@/components/primitives'
import { cn } from '@/lib/utils'
import { easeMedium, spring } from '@/lib/motion'
import { slotAccent, TIER_COLOR, TIER_DIM, TIER_LABEL, tierForRank } from './slots'
import type { ModelState, ReviewState } from '@/hooks/useCouncil'

/**
 * Stage 2 — peer-review aveugle, rendu lisible.
 *
 * Récit : les délégués votent un à un (pastilles qui s'activent), puis le
 * classement Borda se FORME — les lignes se réordonnent en douceur (Motion
 * `layout`) et se colorent selon la sémantique du vote. Le bas du classement
 * n'est pas une erreur : c'est le point de divergence, signalé comme tel.
 */

interface Stage2ReviewProps {
  models: ModelState[]
  reviews: ReviewState[]
  borda: Record<string, number> | null
}

export function Stage2Review({ models, reviews, borda }: Stage2ReviewProps): ReactNode {
  const reduced = useReducedMotion()

  const successful = models.filter((m) => m.phase === 'complete')
  const voted = new Set(reviews.map((r) => r.reviewerSlot))
  const labelOf = (slot: string) => models.find((m) => m.slot === slot)?.label ?? `Modèle ${slot}`

  const ranking = borda
    ? Object.entries(borda)
        .map(([slot, score]) => ({ slot, score }))
        .sort((a, b) => b.score - a.score)
    : []
  const maxScore = ranking.length > 0 ? Math.max(...ranking.map((r) => r.score), 1) : 1

  return (
    <GlassCard className="flex flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-wider text-text-muted uppercase">
          02 — Évaluation croisée
        </span>
        <h2 className="font-display text-2xl leading-snug text-text sm:text-3xl">
          L’assemblée se juge en aveugle
        </h2>
      </header>

      {/* Délégués votants — pastilles qui s'activent à mesure des votes */}
      <div className="flex flex-wrap items-center gap-2">
        {successful.map((m) => {
          const has = voted.has(m.slot)
          return (
            <span
              key={m.slot}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition-colors duration-300',
                has ? 'border-border-bright bg-surface-raised text-text' : 'border-border text-text-subtle',
              )}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: has ? slotAccent(m.slot) : 'var(--text-subtle)' }}
                aria-hidden="true"
              />
              {m.label}
              {has && <Check className="size-3 text-consensus" aria-hidden="true" />}
            </span>
          )
        })}
        <span className="ml-1 font-mono text-xs text-text-subtle" aria-live="polite">
          {voted.size}/{successful.length} ont voté
        </span>
      </div>

      {/* Classement Borda — se forme et se réordonne quand l'agrégat arrive */}
      <AnimatePresence initial={false}>
        {ranking.length > 0 ? (
          <motion.ol
            key="ranking"
            className="flex flex-col gap-2.5"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={easeMedium}
          >
            {ranking.map((row, i) => {
              const tier = tierForRank(i, ranking.length)
              const pct = Math.round((row.score / maxScore) * 100)
              return (
                <motion.li
                  key={row.slot}
                  layout={!reduced}
                  transition={reduced ? { duration: 0 } : spring}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
                  style={{ background: TIER_DIM[tier] }}
                >
                  <span className="w-4 shrink-0 text-center font-mono text-sm text-text-muted">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm text-text">{labelOf(row.slot)}</span>
                      <span
                        className="shrink-0 font-mono text-[0.64rem] tracking-wide uppercase"
                        style={{ color: TIER_COLOR[tier] }}
                      >
                        {TIER_LABEL[tier]}
                      </span>
                    </div>
                    {/* Jauge Borda — la largeur croît, couleur = palier */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-border/50">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: TIER_COLOR[tier] }}
                        initial={reduced ? false : { width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={reduced ? { duration: 0 } : { ...spring, delay: 0.1 + i * 0.06 }}
                      />
                    </div>
                  </div>
                  <span className="w-6 shrink-0 text-right font-mono text-sm text-text-muted">
                    {row.score}
                  </span>
                </motion.li>
              )
            })}
          </motion.ol>
        ) : (
          <motion.p
            key="waiting"
            className="font-mono text-sm text-text-subtle"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Agrégation des votes (Borda)…
          </motion.p>
        )}
      </AnimatePresence>

      {ranking.length > 0 && (
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          Plus une réponse rallie de voix, plus l’accord est fort. La dernière marque le{' '}
          <span className="text-dissent">point de divergence</span> — non une faute, mais l’endroit
          précis où les intelligences cessent de s’accorder.
        </p>
      )}
    </GlassCard>
  )
}
