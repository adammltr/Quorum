import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { track } from '@/lib/analytics'
import { PaywallContext, type PaywallContextValue, type PaywallReason } from './paywall-context'
import { UpgradeDialog } from './UpgradeDialog'

/**
 * Fournit `openPaywall(reason)` à toute l'app et rend un unique soft paywall.
 *
 * Centraliser l'ouverture évite de dupliquer le dialog à chaque point d'appel
 * (quota atteint, modèle premium, export, historique…). Le composant qui
 * déclenche décide de la pertinence (ex. après un verdict vécu) ; le provider,
 * lui, se contente d'afficher l'accroche contextuelle.
 */
export function PaywallProvider({ children }: { children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<PaywallReason>('generic')
  // Incrémenté à chaque ouverture : sert de `key` au dialog → remontage propre
  // (réinitialise son état CTA sans effet de synchronisation).
  const [seq, setSeq] = useState(0)

  const openPaywall = useCallback((next: PaywallReason = 'generic') => {
    setReason(next)
    setSeq((s) => s + 1)
    setOpen(true)
    track('paywall_shown', { reason: next })
  }, [])

  const closePaywall = useCallback(() => setOpen(false), [])

  const value = useMemo<PaywallContextValue>(
    () => ({ openPaywall, closePaywall }),
    [openPaywall, closePaywall],
  )

  return (
    <PaywallContext value={value}>
      {children}
      <UpgradeDialog key={seq} open={open} reason={reason} onOpenChange={setOpen} />
    </PaywallContext>
  )
}
