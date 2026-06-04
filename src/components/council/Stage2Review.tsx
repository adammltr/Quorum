import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Trans, useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { GlassCard } from '@/components/primitives'
import { cn } from '@/lib/utils'
import { easeMedium, spring } from '@/lib/motion'
import { slotAccent, TIER_COLOR, TIER_DIM, tierForRank, type Tier } from './slots'
import type { ModelState, ReviewState } from '@/hooks/useCouncil'

/** Clé i18n du palier de vote (le label visuel vient des ressources). */
const TIER_LABEL_KEY: Record<Tier, string> = {
  consensus: 'tier.consensus',
  partial: 'tier.partial',
  dissent: 'tier.dissent',
}

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
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [explain, setExplain] = useState(false)

  const successful = models.filter((m) => m.phase === 'complete')
  const voted = new Set(reviews.map((r) => r.reviewerSlot))
  const labelOf = (slot: string) =>
    models.find((m) => m.slot === slot)?.label ?? t('stage2.modelFallback', { slot })

  const ranking = borda
    ? Object.entries(borda)
        .map(([slot, score]) => ({ slot, score }))
        .sort((a, b) => b.score - a.score)
    : []
  const maxScore = ranking.length > 0 ? Math.max(...ranking.map((r) => r.score), 1) : 1

  // Reviewers ayant rendu un classement exploitable (pour l'explication détaillée).
  const ballots = reviews.filter((r) => r.parseOk && r.ranking.length > 0)
  const ordinal = (i: number) => `#${i + 1}`
  // Phrase en langage naturel : « X a classé A #1, B #2, C #3. »
  const ballotSentence = (r: ReviewState): string =>
    t('stage2.ballotSentence', {
      reviewer: labelOf(r.reviewerSlot),
      ranking: r.ranking.map((s, i) => `${labelOf(s)} ${ordinal(i)}`).join(', '),
    })
  // Total maximal théorique : chaque bulletin attribue 3 pts à son 1er choix.
  const maxBorda = ballots.length * 3
  const top = ranking[0]

  return (
    <GlassCard className="flex flex-col gap-6 p-6 sm:p-8">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-wider text-text-muted uppercase">
          {t('stage2.eyebrow')}
        </span>
        <h2 className="font-display text-2xl leading-snug text-text sm:text-3xl">
          {t('stage2.title')}
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
          {t('stage2.votedCount', { n: voted.size, total: successful.length })}
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
                        {t(TIER_LABEL_KEY[tier])}
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
            {t('stage2.aggregating')}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Explication du calcul Borda — accordéon discret, en langage naturel */}
      {ranking.length > 0 && ballots.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setExplain((v) => !v)}
            aria-expanded={explain}
            className="self-start text-xs text-text-subtle underline-offset-4 transition-colors hover:text-text-muted hover:underline"
          >
            {t('stage2.howScored')} {explain ? '↑' : '↓'}
          </button>
          <AnimatePresence initial={false}>
            {explain && (
              <motion.div
                key="explain"
                className="overflow-hidden"
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={easeMedium}
              >
                <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-surface-raised/40 px-4 py-3">
                  <ul className="flex flex-col gap-1.5">
                    {ballots.map((r) => (
                      <li key={r.reviewerSlot} className="text-sm leading-relaxed text-text-muted">
                        {ballotSentence(r)}
                      </li>
                    ))}
                  </ul>
                  {top && (
                    <p className="border-t border-border/60 pt-2 font-mono text-xs text-text">
                      {t('stage2.bordaFinal', {
                        label: labelOf(top.slot),
                        score: top.score,
                        max: maxBorda,
                      })}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {ranking.length > 0 && (
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          <Trans
            i18nKey="stage2.explainer"
            components={[<span key="d" className="text-dissent" />]}
          />
        </p>
      )}
    </GlassCard>
  )
}
