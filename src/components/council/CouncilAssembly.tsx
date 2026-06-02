import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { SpringReveal, StaggerContainer } from '@/components/primitives'
import { ModelCard } from './ModelCard'
import { slotAccent } from './slots'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { ModelState, SlotPhase } from '@/hooks/useCouncil'

/** Hauteur de carte stable — aucun layout shift selon l'état/longueur. */
const CARD_HEIGHT = 'h-[clamp(20rem,46vh,32rem)]'

interface CouncilAssemblyProps {
  models: ModelState[]
  /** Force le rejeu de l'entrée orchestrée à chaque nouvelle question. */
  runKey: number
  /** true → onglets (mobile) ; false → grille (≥ sm). */
  compact: boolean
}

function phaseClasses(phase: SlotPhase): string {
  switch (phase) {
    case 'error':
    case 'timeout':
      return 'opacity-50'
    default:
      return ''
  }
}

export function CouncilAssembly({ models, runKey, compact }: CouncilAssemblyProps): ReactNode {
  if (compact) return <CouncilTabs models={models} runKey={runKey} />

  return (
    <StaggerContainer
      key={runKey}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {models.map((model) => (
        <SpringReveal key={model.slot} inStagger>
          <ModelCard model={model} className={CARD_HEIGHT} />
        </SpringReveal>
      ))}
    </StaggerContainer>
  )
}

// ─── Variante mobile : onglets élégants ──────────────────────────────────────

function CouncilTabs({ models, runKey }: { models: ModelState[]; runKey: number }): ReactNode {
  const reduced = useReducedMotion()
  const [active, setActive] = useState<string>(models[0]?.slot ?? 'A')

  // Nouvelle question → revenir au premier délégué (ajustement d'état pendant
  // le rendu, pattern React sanctionné — pas d'effet, pas de render en cascade).
  const [prevRunKey, setPrevRunKey] = useState(runKey)
  if (runKey !== prevRunKey) {
    setPrevRunKey(runKey)
    setActive(models[0]?.slot ?? 'A')
  }

  const activeModel = models.find((m) => m.slot === active) ?? models[0]
  if (!activeModel) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Barre d'onglets — accessible (tablist) */}
      <div role="tablist" aria-label="Délégués de l’assemblée" className="grid grid-cols-4 gap-2">
        {models.map((m) => {
          const selected = m.slot === active
          return (
            <button
              key={m.slot}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${m.slot}`}
              onClick={() => setActive(m.slot)}
              className={cn(
                'relative flex items-center justify-center gap-2 rounded-lg border px-2 py-2.5 font-mono text-xs transition-colors',
                selected
                  ? 'border-border-bright bg-surface-raised text-text'
                  : 'border-border text-text-muted hover:text-text',
                phaseClasses(m.phase),
              )}
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full"
                style={{ background: slotAccent(m.slot) }}
              />
              <span className="truncate">{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* Carte active */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeModel.slot}
          id={`panel-${activeModel.slot}`}
          role="tabpanel"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={ease}
        >
          <ModelCard model={activeModel} className={CARD_HEIGHT} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
