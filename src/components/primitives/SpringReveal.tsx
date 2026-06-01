import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { type ReactNode } from 'react'
import { cardVariant } from '@/lib/motion'

type SpringRevealProps = Omit<HTMLMotionProps<'div'>, 'variants'> & {
  children: ReactNode
  /** true si placé dans un <StaggerContainer> (le parent pilote l'entrée). */
  inStagger?: boolean
}

/**
 * Révélation par ressort (montée + léger scale) — l'entrée signature des
 * cartes de modèle. Respecte prefers-reduced-motion.
 */
export function SpringReveal({
  children,
  inStagger = false,
  ...props
}: SpringRevealProps): ReactNode {
  const reduced = useReducedMotion()

  // Mouvement réduit → aucune prop d'animation : rendu statique immédiat.
  const animation: HTMLMotionProps<'div'> = reduced
    ? {}
    : inStagger
      ? { variants: cardVariant }
      : { variants: cardVariant, initial: 'hidden', animate: 'show' }

  return (
    <motion.div {...animation} {...props}>
      {children}
    </motion.div>
  )
}
