/**
 * Questions d'amorçage du first-run (SPEC §4).
 *
 * Choisies pour MONTRER l'intérêt du multi-modèle : des dilemmes à arbitrages
 * où les modèles vont diverger — c'est là que le peer-review et le verdict
 * prennent tout leur sens. Une est pré-remplie au chargement (zéro écran vide),
 * les autres sont proposées en suggestions.
 */
export const SEED_QUESTIONS: readonly string[] = [
  'La conscience peut-elle être simulée, ou est-elle fondamentalement biologique ?',
  'Quand croissance économique et écologie s’opposent, laquelle faut-il privilégier ?',
  'Pour diriger, vaut-il mieux être craint ou aimé ?',
  'Faut-il dire une vérité qui blesse ou un mensonge qui réconforte ?',
  'Une IA devrait-elle pouvoir prendre une décision médicale sans supervision humaine ?',
  'Vaut-il mieux optimiser sa vie pour le bonheur ou pour le sens ?',
] as const

/** Retourne une question au hasard (rotation à chaque visite). */
export function randomSeed(): string {
  const i = Math.floor(Math.random() * SEED_QUESTIONS.length)
  return SEED_QUESTIONS[i] ?? SEED_QUESTIONS[0] ?? ''
}

/**
 * Retourne `count` suggestions distinctes de la question déjà affichée
 * (pour la rangée « Ou explorez : » du first-run).
 */
export function otherSuggestions(current: string, count = 3): string[] {
  return SEED_QUESTIONS.filter((q) => q !== current).slice(0, count)
}
