/** Barrel de la couche facturation (abstraite, sans fournisseur au MVP). */
export type {
  BillingInterval,
  BillingProvider,
  CheckoutResult,
  SubscriptionStatus,
} from './types'
export { getBillingProvider } from './provider'
export { maybeStartReverseTrial, type TrialOutcome } from './trial'
