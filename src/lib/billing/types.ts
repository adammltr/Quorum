/**
 * Abstraction « facturation » — INDÉPENDANTE de tout fournisseur.
 *
 * Le reste de l'app ne connaît QUE cette interface. Brancher Lemon Squeezy,
 * Polar, Paddle ou Stripe plus tard = écrire une implémentation de
 * `BillingProvider`, sans toucher aux composants.
 *
 * ⚠️  CHOIX DU FOURNISSEUR (à lire avant de câbler un vrai paiement) :
 *     Quorum est porté par un éditeur MINEUR. Stripe direct exige un compte
 *     entreprise/adulte et reporte sur toi la TVA et la conformité fiscale
 *     internationale. Préférer un MERCHANT OF RECORD (MoR) — Lemon Squeezy,
 *     Polar ou Paddle — qui devient le vendeur légal, gère TVA/sales-tax,
 *     facturation et remboursements, et accepte des créateurs individuels.
 *     Détails et arbitrage : docs/MONETISATION.md.
 */

import type { BillingProviderId } from '@/config/billing'

/** Cadence d'abonnement proposée au checkout. */
export type BillingInterval = 'monthly' | 'yearly'

/** Résultat d'une tentative d'ouverture de checkout. */
export type CheckoutResult =
  | { ok: true; /** URL hébergée du fournisseur vers laquelle rediriger. */ url: string }
  | { ok: false; /** `disabled` = aucun fournisseur configuré (MVP). */ reason: 'disabled' | 'error'; message: string }

/** État d'abonnement normalisé (au-dessus des webhooks fournisseur). */
export interface SubscriptionStatus {
  active: boolean
  /** Fin de période courante / du trial, ISO 8601. null = pas d'échéance. */
  currentPeriodEnd: string | null
  interval: BillingInterval | null
}

/**
 * Contrat que chaque fournisseur de paiement doit remplir. Volontairement
 * minimal : ce dont l'UI a besoin, rien de plus. Tout est async (réseau).
 */
export interface BillingProvider {
  /** Identifiant du fournisseur (`none` tant qu'aucun n'est câblé). */
  readonly id: BillingProviderId
  /** true si un vrai checkout est disponible (false en mode MVP `none`). */
  readonly enabled: boolean

  /** Ouvre (ou prépare) un checkout PRO pour l'utilisateur courant. */
  createCheckout(params: { userId: string; interval: BillingInterval; email?: string | null }): Promise<CheckoutResult>

  /** URL du portail de gestion d'abonnement (résiliation, factures). null si indisponible. */
  getPortalUrl(params: { userId: string }): Promise<string | null>

  /** Statut d'abonnement courant. Source de vérité applicative = profiles.is_pro. */
  getSubscription(params: { userId: string }): Promise<SubscriptionStatus | null>
}
