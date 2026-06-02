import { useContext } from 'react'
import { PaywallContext, type PaywallContextValue } from './paywall-context'

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext)
  if (ctx === null) {
    throw new Error('usePaywall doit être utilisé à l’intérieur de <PaywallProvider>.')
  }
  return ctx
}
