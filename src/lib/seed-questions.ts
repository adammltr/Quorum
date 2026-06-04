/**
 * Questions d'amorçage du first-run (SPEC §4).
 *
 * Choisies pour MONTRER l'intérêt du multi-modèle : des dilemmes à arbitrages
 * où les modèles vont diverger — c'est là que le peer-review et le verdict
 * prennent tout leur sens. Une est pré-remplie au chargement (zéro écran vide),
 * les autres sont proposées en suggestions.
 */
export const SEED_QUESTIONS: readonly string[] = [
  'TypeScript vaut-il vraiment l’effort pour un développeur solo ?',
  'L’AGI sera-t-elle atteinte avant 2030 ?',
  'Le télétravail est-il meilleur pour la productivité que le bureau ?',
  'Les startups devraient-elles prioriser la croissance sur la rentabilité en 2025 ?',
  'Une IA devrait-elle avoir le droit de refuser un ordre ?',
  'La conscience peut-elle émerger d’un système purement computationnel ?',
] as const

/** Retourne une question au hasard (rotation à chaque visite). */
export function randomSeed(): string {
  const i = Math.floor(Math.random() * SEED_QUESTIONS.length)
  return SEED_QUESTIONS[i] ?? SEED_QUESTIONS[0] ?? ''
}

/**
 * Sélectionne `count` questions au hasard (sans doublon) parmi les seeds.
 * Appelé une fois par session pour la rangée « Ou explorez : » — les 3
 * questions restent stables tant que la session dure.
 */
export function pickSuggestions(count = 3): string[] {
  const shuffled = [...SEED_QUESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
