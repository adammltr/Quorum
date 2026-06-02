/**
 * Résolution du fournisseur de paiement actif.
 *
 * Au MVP, AUCUN fournisseur n'est câblé : `getBillingProvider()` renvoie le
 * `NoopBillingProvider`, qui ne déclenche jamais de paiement et signale
 * proprement que le checkout est indisponible. Les CTA PRO restent donc
 * informatifs (présentation de la valeur) sans rien facturer.
 *
 * Pour activer un vrai paiement plus tard : implémenter `BillingProvider` pour
 * le MoR choisi (voir types.ts + docs/MONETISATION.md), puis le retourner ici
 * selon `BILLING_FLAGS.provider`.
 */

import { BILLING_FLAGS, type BillingProviderId } from '@/config/billing'
import type { BillingProvider, CheckoutResult, SubscriptionStatus } from './types'

const DISABLED: CheckoutResult = {
  ok: false,
  reason: 'disabled',
  message: 'Le paiement n’est pas encore activé. Reviens bientôt — ou utilise BYOK dès maintenant.',
}

/** Fournisseur « aucun » — état par défaut tant qu'aucun MoR n'est branché. */
class NoopBillingProvider implements BillingProvider {
  readonly id: BillingProviderId = 'none'
  readonly enabled = false

  createCheckout(): Promise<CheckoutResult> {
    return Promise.resolve(DISABLED)
  }

  getPortalUrl(): Promise<string | null> {
    return Promise.resolve(null)
  }

  getSubscription(): Promise<SubscriptionStatus | null> {
    return Promise.resolve(null)
  }
}

const noop = new NoopBillingProvider()

/**
 * Fournisseur actif selon la configuration. Tant que `BILLING_FLAGS.provider`
 * vaut `none` (ou un fournisseur non encore implémenté), on renvoie le Noop :
 * jamais de paiement déclenché par erreur.
 */
export function getBillingProvider(): BillingProvider {
  switch (BILLING_FLAGS.provider) {
    // case 'lemonsqueezy': return lemonSqueezyProvider   // à implémenter (MoR recommandé)
    // case 'polar':        return polarProvider          // à implémenter (MoR)
    // case 'paddle':       return paddleProvider          // à implémenter (MoR)
    // case 'stripe':       return stripeProvider          // déconseillé pour un éditeur mineur
    case 'none':
    default:
      return noop
  }
}
