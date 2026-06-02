import { useEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Jauge circulaire du score de consensus (0–100) — élément de design fort.
 * L'anneau se dessine et le nombre s'incrémente (count-up rAF, 60 fps) ; la
 * couleur suit la sémantique du vote. Tout est figé si prefers-reduced-motion.
 */

function tierColor(score: number): string {
  if (score >= 67) return 'var(--consensus)'
  if (score >= 40) return 'var(--partial)'
  return 'var(--dissent)'
}

interface ConsensusRingProps {
  score: number
  size?: number
  className?: string
}

export function ConsensusRing({ score, size = 168, className }: ConsensusRingProps): ReactNode {
  const reduced = useReducedMotion()
  const [animated, setAnimated] = useState<number>(0)

  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const target = Math.max(0, Math.min(100, score))
  const color = tierColor(target)
  const offset = circ * (1 - target / 100)
  const display = reduced ? target : animated

  // Count-up du nombre (rAF) — setState dans le callback rAF, jamais en cascade.
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const start = performance.now()
    const duration = 1100
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setAnimated(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reduced])

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score de consensus : ${target} sur 100`}
    >
      {/* Halo doux teinté par le palier */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: color, opacity: 0.14 }}
      />
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduced ? false : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-4xl tabular-nums text-text" style={{ color }}>
          {display}
        </span>
        <span className="font-mono text-xs text-text-subtle">/ 100</span>
      </div>
    </div>
  )
}
