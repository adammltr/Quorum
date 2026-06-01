import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'motion/react'
import { type ReactNode } from 'react'
import { easeMedium } from '@/lib/motion'

const fadeVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: easeMedium },
}

type FadeInProps = Omit<HTMLMotionProps<'div'>, 'variants'> & {
  children: ReactNode
  /** Délai avant l'apparition (s), ignoré si orchestré par un parent. */
  delay?: number
  /** true si placé dans un <StaggerContainer> (le parent pilote l'entrée). */
  inStagger?: boolean
}

/** Fondu doux + légère montée. Respecte prefers-reduced-motion. */
export function FadeIn({
  children,
  delay = 0,
  inStagger = false,
  ...props
}: FadeInProps): ReactNode {
  const reduced = useReducedMotion()

  // Mouvement réduit → aucune prop d'animation : rendu statique immédiat.
  const animation: HTMLMotionProps<'div'> = reduced
    ? {}
    : inStagger
      ? { variants: fadeVariants }
      : {
          variants: fadeVariants,
          initial: 'hidden',
          animate: 'show',
          transition: { ...easeMedium, delay },
        }

  return (
    <motion.div {...animation} {...props}>
      {children}
    </motion.div>
  )
}
