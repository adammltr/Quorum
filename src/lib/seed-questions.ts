/**
 * Questions d'amorçage du first-run (SPEC §4), bilingues.
 *
 * Choisies pour MONTRER l'intérêt du multi-modèle : des dilemmes à arbitrages
 * où les modèles vont diverger — c'est là que le peer-review et le verdict
 * prennent tout leur sens. Une est pré-remplie au chargement (zéro écran vide),
 * les autres sont proposées en suggestions. La langue suit i18next.
 */
export const SEED_QUESTIONS = {
  en: [
    'Will AGI be achieved before 2030?',
    'Is TypeScript worth the overhead for solo developers?',
    'Should startups prioritize growth over profitability?',
    'Can consciousness emerge from a purely computational system?',
    'Should an AI have the right to refuse an order?',
    'Is remote work better for productivity than the office?',
  ],
  fr: [
    "L'AGI sera-t-elle atteinte avant 2030 ?",
    "TypeScript vaut-il vraiment l'effort pour un développeur solo ?",
    'Les startups devraient-elles prioriser la croissance sur la rentabilité ?',
    "La conscience peut-elle émerger d'un système purement computationnel ?",
    'Une IA devrait-elle avoir le droit de refuser un ordre ?',
    'Le télétravail est-il meilleur pour la productivité que le bureau ?',
  ],
} as const

export type SeedLang = keyof typeof SEED_QUESTIONS

/** Questions pour la langue active (repli sur l'anglais si non supportée). */
export function seedQuestions(lang: string): readonly string[] {
  const key = lang.slice(0, 2) as SeedLang
  return SEED_QUESTIONS[key] ?? SEED_QUESTIONS.en
}

/** Retourne une question au hasard pour la langue donnée. */
export function randomSeed(lang: string): string {
  const seeds = seedQuestions(lang)
  const i = Math.floor(Math.random() * seeds.length)
  return seeds[i] ?? seeds[0] ?? ''
}

/**
 * Sélectionne `count` questions au hasard (sans doublon) pour la langue donnée.
 * Recalculé quand la langue change — la rangée « Or explore: » suit la langue.
 */
export function pickSuggestions(lang: string, count = 3): string[] {
  const shuffled = [...seedQuestions(lang)].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
