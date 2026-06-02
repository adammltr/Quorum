import { createContext } from 'react'

/**
 * Raison contextuelle d'ouverture du soft paywall. Détermine l'accroche : on
 * part TOUJOURS de la valeur que l'utilisateur vient de vivre, jamais d'un
 * blocage sec.
 */
export type PaywallReason =
  | 'quota' // quota quotidien atteint après un verdict
  | 'premium_model' // a voulu sélectionner un modèle premium
  | 'history' // limite d'historique 7 jours
  | 'export' // export HD/PDF
  | 'councils' // limite de councils
  | 'generic'

export interface PaywallContextValue {
  /** Ouvre le paywall avec une accroche adaptée au contexte. */
  openPaywall: (reason?: PaywallReason) => void
  /** Ferme le paywall (toujours possible — jamais bloquant). */
  closePaywall: () => void
}

export const PaywallContext = createContext<PaywallContextValue | null>(null)
