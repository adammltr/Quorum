import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { easeMedium } from '@/lib/motion'
import type { RunPhase } from '@/hooks/useCouncil'

/**
 * Fil narratif des 3 stages : « ils répondent → ils votent → verdict ».
 * Une barre de progression se remplit (ambre au stage final) ; chaque jalon
 * passe de à-venir → en-cours → terminé. Respecte prefers-reduced-motion.
 */

const STEPS = [
  { n: 1, labelKey: 'council.stepAnswers' },
  { n: 2, labelKey: 'council.stepEvaluation' },
  { n: 3, labelKey: 'council.stepVerdict' },
] as const

interface StageStepperProps {
  stage: 1 | 2 | 3
  phase: RunPhase
}

export function StageStepper({ stage, phase }: StageStepperProps): ReactNode {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const done = phase === 'done'
  // Progression 0 → 1 : stage 1 = 0, stage 2 = 0.5, stage 3/terminé = 1.
  const progress = done ? 1 : (stage - 1) / (STEPS.length - 1)

  return (
    <div className="flex w-full max-w-md items-center" aria-hidden="true">
      {STEPS.map((step, i) => {
        const completed = done || stage > step.n
        const active = !done && stage === step.n
        const isVerdict = step.n === 3
        const reached = active || completed

        return (
          <div key={step.n} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border font-mono text-xs transition-colors duration-300',
                  reached
                    ? isVerdict && reached
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-border-bright bg-surface-raised text-text'
                    : 'border-border text-text-subtle',
                )}
              >
                {completed ? <Check className="size-3.5" /> : step.n}
              </span>
              <span
                className={cn(
                  'font-mono text-[0.64rem] tracking-wide transition-colors duration-300',
                  active ? (isVerdict ? 'text-gold' : 'text-text') : 'text-text-subtle',
                )}
              >
                {t(step.labelKey)}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div className="relative mx-2 h-px flex-1 self-start" style={{ marginTop: '0.75rem' }}>
                <span className="absolute inset-0 bg-border" />
                <motion.span
                  className="absolute inset-y-0 left-0 bg-border-bright"
                  initial={false}
                  animate={{ scaleX: stage > step.n || done ? 1 : 0 }}
                  style={{ originX: 0, width: '100%' }}
                  transition={reduced ? { duration: 0 } : easeMedium}
                />
              </div>
            )}
          </div>
        )
      })}
      <span className="ml-3 hidden font-mono text-[0.64rem] text-text-subtle sm:inline">
        {Math.round(progress * 100)}%
      </span>
    </div>
  )
}
