import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { type ReactNode } from 'react'
import { staggerContainer } from '@/lib/motion'

type StaggerContainerProps = Omit<HTMLMotionProps<'div'>, 'variants'> & {
  children: ReactNode
}

/**
 * Conteneur orchestrant la révélation décalée de ses enfants (le « load
 * orchestré » des 4 colonnes). Combine avec <SpringReveal>/<FadeIn>.
 * Si prefers-reduced-motion : rendu immédiat, sans stagger.
 */
export function StaggerContainer({
  children,
  ...props
}: StaggerContainerProps): ReactNode {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : 'hidden'}
      animate="show"
      variants={reduced ? undefined : staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  )
}
