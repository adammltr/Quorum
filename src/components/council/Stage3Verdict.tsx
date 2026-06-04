import { type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown, { type Components } from 'react-markdown'
import { ConsensusRing } from './ConsensusRing'
import { cn } from '@/lib/utils'
import { easeMedium } from '@/lib/motion'
import type { RunPhase, VerdictState } from '@/hooks/useCouncil'

/**
 * Stage 3 — verdict du Chairman. Le climax : Instrument Serif, accent ambre,
 * halo doux, reveal soigné. Le score de consensus est un anneau animé ; les
 * désaccords sont exposés comme une matière précieuse, pas comme un défaut.
 */

function tierWordKey(score: number): string {
  if (score >= 67) return 'stage3.tierBroad'
  if (score >= 40) return 'stage3.tierNuanced'
  return 'stage3.tierStrongDivergence'
}

/**
 * Whitelist de rendu markdown pour le verdict. Le Chairman écrit du texte
 * structuré (**en-têtes**, listes) mais JAMAIS de titres de section (h1/h2/h3) :
 * seuls strong/em/p/ul/ol/li/hr sont autorisés, le reste est déballé en texte.
 */
const VERDICT_ALLOWED = ['strong', 'em', 'p', 'ul', 'ol', 'li', 'hr'] as const

const verdictComponents: Components = {
  p: ({ children }: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-4 last:mb-0">{children}</p>
  ),
  strong: ({ children }: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-medium text-gold">{children}</strong>
  ),
  em: ({ children }: ComponentPropsWithoutRef<'em'>) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-4 flex list-disc flex-col gap-1.5 pl-6 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-4 flex list-decimal flex-col gap-1.5 pl-6 last:mb-0">{children}</ol>
  ),
  li: ({ children }: ComponentPropsWithoutRef<'li'>) => <li>{children}</li>,
  hr: () => <hr className="my-6 border-border/60" />,
}

interface Stage3VerdictProps {
  verdict: VerdictState
  phase: RunPhase
}

export function Stage3Verdict({ verdict, phase }: Stage3VerdictProps): ReactNode {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const streaming = phase === 'running'
  const hasScore = verdict.consensusScore !== null
  const score = verdict.consensusScore ?? 0

  return (
    <motion.section
      className="relative overflow-hidden rounded-2xl border border-gold/25 p-6 sm:p-10"
      style={{ background: 'var(--surface-glass)' }}
      initial={reduced ? false : { opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : { ...easeMedium, duration: 0.5 }}
    >
      {/* Halo ambre — la valeur « brille » (rare, donc fort) */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[80%] -translate-x-1/2 rounded-full bg-gold-dim blur-[120px]"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 1.1, delay: 0.2 }}
      />

      <div className="relative flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <span className="font-mono text-xs tracking-wider text-gold uppercase">
            {t('stage3.eyebrow')}
          </span>
          <h2 className="font-display text-2xl leading-snug text-text sm:text-3xl">
            {t('stage3.title')}
          </h2>
        </header>

        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-12">
          {/* Score de consensus — anneau animé */}
          <div className="flex flex-col items-center gap-3 lg:items-start">
            {hasScore ? (
              <>
                <ConsensusRing score={score} />
                <div className="flex flex-col items-center gap-0.5 lg:items-start">
                  <span className="font-mono text-xs tracking-wide text-text-muted uppercase">
                    {t('stage3.consensusScore')}
                  </span>
                  <span className="font-mono text-sm text-text">{t(tierWordKey(score))}</span>
                </div>
              </>
            ) : (
              <div
                className="grid size-[168px] place-items-center rounded-full border border-border"
                aria-hidden="true"
              >
                <span className="inline-flex items-center gap-1.5">
                  {[0, 160, 320].map((delay) => (
                    <span
                      key={delay}
                      className="thinking-dot"
                      style={{ background: 'var(--gold)', animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Corps du verdict — Instrument Serif, le grand moment */}
          <div className="flex flex-col gap-6">
            {verdict.body.length === 0 ? (
              <p className="chairman-pulse inline-flex items-center gap-3 font-display text-2xl text-text-subtle italic">
                {t('stage3.deliberating')}
                <span aria-hidden="true" className="inline-flex items-center gap-1.5 not-italic">
                  {[0, 160, 320].map((delay) => (
                    <span
                      key={delay}
                      className="thinking-dot"
                      style={{ background: 'var(--gold)', animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              </p>
            ) : (
              <div className="font-display text-2xl leading-snug text-text sm:text-[2rem] sm:leading-[1.3]">
                <ReactMarkdown
                  allowedElements={[...VERDICT_ALLOWED]}
                  unwrapDisallowed
                  components={verdictComponents}
                >
                  {verdict.body}
                </ReactMarkdown>
                {streaming && <span aria-hidden="true" className="stream-caret" />}
              </div>
            )}

            {/* Désaccords assumés — information précieuse, élégamment exposée */}
            {verdict.disagreements.length > 0 && (
              <motion.div
                className="flex flex-col gap-3 border-t border-border/60 pt-5"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { ...easeMedium, delay: 0.15 }}
              >
                <span className="font-mono text-xs tracking-wider text-text-muted uppercase">
                  {t('stage3.disagreements')}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {verdict.disagreements.map((d, i) => (
                    <li key={i} className={cn('flex items-start gap-3 text-base leading-relaxed text-text')}>
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-dissent"
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </div>

        {/* Disclaimer factuel — Quorum synthétise des perspectives, ne valide pas des faits. */}
        <p className="mt-6 border-t border-border/60 pt-4 text-xs text-text-subtle italic">
          {t('stage3.disclaimer')}
        </p>
      </div>
    </motion.section>
  )
}
