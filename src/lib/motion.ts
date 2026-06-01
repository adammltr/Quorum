import type { Transition, Variants } from 'motion/react'

/* ════════════════════════════════════════════════════════════════════
   Quorum — Vocabulaire d'animation (DESIGN.md §6).
   Un seul « load orchestré » à l'arrivée. Ressorts naturels, pas de rebond.
   ════════════════════════════════════════════════════════════════════ */

/** Ressort par défaut — naturel, sans rebond excessif. */
export const spring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}

/** Ressort léger — petits éléments (badges, tooltips). */
export const springLight: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 0.5,
}

/** Transition douce (tween) — couleurs, opacités. */
export const ease: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
}

/** Transition douce un peu plus longue. */
export const easeMedium: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1],
}

/** Conteneur orchestrant un stagger (révélation décalée des enfants). */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

/** Carte de modèle — entrée par ressort (montée + léger scale). */
export const cardVariant: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring,
  },
}

/** Verdict Chairman — entrée distincte, plus posée. */
export const verdictVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...ease, duration: 0.5, delay: 0.2 },
  },
}
