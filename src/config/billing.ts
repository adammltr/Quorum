/**
 * Configuration freemium — SOURCE UNIQUE côté client.
 *
 * Centralise tout ce qui définit l'offre open-core : plafonds FREE, valeur PRO,
 * tarifs, durée du reverse-trial, feature flags. Les composants et hooks lisent
 * ICI, jamais des constantes éparpillées.
 *
 * ⚠️  AUTORITÉ : l'application réelle des quotas/plafonds se fait CÔTÉ SERVEUR
 *     (table `billing_config` + triggers + RPC `increment_question_usage`,
 *     migration 0019). Ce fichier en est le MIROIR pour un retour UI immédiat.
 *     Garder les deux alignés ; en cas de divergence, le serveur tranche.
 *
 * Tout est surchargeable par variable d'environnement `VITE_*` (build-time) afin
 * d'ajuster l'offre sans toucher au code.
 */

/** Lit un entier d'env (`VITE_*`), avec valeur de repli si absent/invalide. */
function envInt(value: string | undefined, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** Lit un flag d'env (`"true"` = activé). */
function envFlag(value: string | undefined): boolean {
  return value === 'true'
}

const env = import.meta.env

// ─── Plafonds FREE (miroir de billing_config + triggers serveur) ────────────
export const FREE_TIER = {
  /** Questions/jour sans compte (IP/session anonyme). Configurable. */
  dailyQuestionsAnon: envInt(env.VITE_FREE_DAILY_QUESTIONS_ANON, 5),
  /** Questions/jour avec un compte gratuit. Configurable. */
  dailyQuestionsAccount: envInt(env.VITE_FREE_DAILY_QUESTIONS, 10),
  /** Rétention de l'historique (jours) en FREE. */
  historyDays: 7,
  /** Collections nommées en FREE. */
  collections: 2,
  /** Councils personnalisés sauvegardés en FREE. */
  councils: 1,
} as const

// ─── Offre PRO ───────────────────────────────────────────────────────────────
export const PRO_TIER = {
  /** Councils personnalisés sauvegardés en PRO. */
  councils: 10,
  /** Prix indicatifs (affichage uniquement — aucun paiement câblé au MVP). */
  priceMonthlyEur: 8,
  priceYearlyEur: 72,
} as const

/** Argumentaire PRO présenté dans le soft paywall (ordre = priorité visuelle). */
export const PRO_BENEFITS: readonly string[] = [
  'Modèles premium : GPT-5.1, Claude, Gemini 3…',
  'Questions illimitées avec ta propre clé (BYOK)',
  'Historique illimité + recherche full-text',
  'Export : image HD, Markdown, PDF, lien permanent',
  'Councils premium et jusqu’à 10 assemblées sauvegardées',
] as const

// ─── Reverse-trial (sous feature flag) ──────────────────────────────────────
export const REVERSE_TRIAL = {
  /** Activé par flag : X jours de PRO offerts aux nouveaux comptes. */
  enabled: envFlag(env.VITE_FEATURE_REVERSE_TRIAL),
  /** Durée du trial (jours). Le serveur reste l'autorité (billing_config). */
  days: envInt(env.VITE_REVERSE_TRIAL_DAYS, 7),
} as const

// ─── Feature flags monétisation ─────────────────────────────────────────────
export const BILLING_FLAGS = {
  /** BYOK (saisie de clé OpenRouter perso) exposé dans l'UI. */
  byok: envFlag(env.VITE_FEATURE_BYOK),
  /**
   * Fournisseur de paiement actif. `none` = aucun (défaut) : les CTA PRO
   * informent sans déclencher de checkout. Voir docs/MONETISATION.md.
   */
  provider: (env.VITE_BILLING_PROVIDER ?? 'none') as BillingProviderId,
} as const

/** Identifiants de fournisseurs de paiement supportés (abstraction). */
export type BillingProviderId = 'none' | 'lemonsqueezy' | 'polar' | 'paddle' | 'stripe'

/** Prix mensuel formaté (ex. « 8 €/mois »). */
export function monthlyLabel(): string {
  return `${PRO_TIER.priceMonthlyEur} €/mois`
}

/** Prix annuel formaté (ex. « 72 €/an »). */
export function yearlyLabel(): string {
  return `${PRO_TIER.priceYearlyEur} €/an`
}
