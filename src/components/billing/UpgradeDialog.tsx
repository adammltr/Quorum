import { useState, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { Check, KeyRound, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/use-auth'
import {
  BILLING_FLAGS,
  PRO_BENEFITS,
  monthlyLabel,
  yearlyLabel,
} from '@/config/billing'
import { getBillingProvider, type BillingInterval } from '@/lib/billing'
import { track } from '@/lib/analytics'
import type { PaywallReason } from './paywall-context'

interface UpgradeDialogProps {
  open: boolean
  reason: PaywallReason
  onOpenChange: (open: boolean) => void
}

/** Clés i18n de l'accroche contextuelle (le texte vient des ressources). */
const COPY_KEYS: Record<PaywallReason, { title: string; sub: string }> = {
  quota: { title: 'pro.copy.quotaTitle', sub: 'pro.copy.quotaSub' },
  premium_model: { title: 'pro.copy.premiumTitle', sub: 'pro.copy.premiumSub' },
  history: { title: 'pro.copy.historyTitle', sub: 'pro.copy.historySub' },
  export: { title: 'pro.copy.exportTitle', sub: 'pro.copy.exportSub' },
  councils: { title: 'pro.copy.councilsTitle', sub: 'pro.copy.councilsSub' },
  generic: { title: 'pro.copy.genericTitle', sub: 'pro.copy.genericSub' },
}

type CtaState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'info'; message: string }

/**
 * Soft paywall — fenêtre de valeur PRO, contextuelle et TOUJOURS fermable.
 *
 * Règle SPEC §7 : ne s'ouvre jamais avant le premier moment de valeur. Au MVP,
 * aucun paiement n'est câblé : le CTA passe par l'abstraction `BillingProvider`,
 * qui répond proprement « indisponible » (state `info`) sans rien facturer.
 */
export function UpgradeDialog({ open, reason, onOpenChange }: UpgradeDialogProps): ReactNode {
  const { t } = useTranslation()
  const { userId, email } = useAuth()
  // L'état CTA est remis à zéro à chaque ouverture via le `key` posé par
  // PaywallProvider (remontage), donc pas d'effet de synchronisation ici.
  const [cta, setCta] = useState<CtaState>({ kind: 'idle' })
  const copy = COPY_KEYS[reason]

  const handleUpgrade = async (interval: BillingInterval) => {
    track('upgrade_intent', { reason, interval })
    setCta({ kind: 'loading' })
    const provider = getBillingProvider()
    const res = await provider.createCheckout({ userId: userId ?? '', interval, email })
    if (res.ok) {
      window.location.assign(res.url)
      return
    }
    setCta({ kind: 'info', message: res.message })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-2xl border border-gold/30 bg-surface-raised p-8 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold-dim px-2 py-0.5 font-mono text-[0.64rem] tracking-wide text-gold uppercase">
                <Sparkles aria-hidden="true" className="size-3" />
                {t('pro.brand')}
              </span>
              <Dialog.Title className="font-display text-2xl leading-snug text-text">
                {t(copy.title)}
              </Dialog.Title>
              <p className="text-sm text-text-muted">{t(copy.sub)}</p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('common.close')}>
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <ul className="flex flex-col gap-2.5">
            {PRO_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-base text-text">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              className="w-full"
              disabled={cta.kind === 'loading'}
              onClick={() => void handleUpgrade('yearly')}
            >
              {cta.kind === 'loading' ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  {t('pro.oneMoment')}
                </>
              ) : (
                <>{t('pro.upgradeYearly', { label: yearlyLabel() })}</>
              )}
            </Button>
            <button
              type="button"
              disabled={cta.kind === 'loading'}
              onClick={() => void handleUpgrade('monthly')}
              className="text-center text-sm text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline disabled:opacity-50"
            >
              {t('pro.monthlyOption', { label: monthlyLabel() })}
            </button>
          </div>

          {cta.kind === 'info' && (
            <p
              role="status"
              className="rounded-lg border border-border bg-surface/60 px-3.5 py-2.5 text-center text-xs text-text-muted"
            >
              {cta.message}
            </p>
          )}

          {BILLING_FLAGS.byok && (
            <div className="flex flex-col items-center gap-1 border-t border-border pt-4 text-center">
              <span className="inline-flex items-center gap-1.5 text-sm text-text">
                <KeyRound aria-hidden="true" className="size-4 text-text-muted" />
                {t('pro.alreadyHaveKey')}
              </span>
              <p className="text-xs text-text-subtle">{t('pro.byokNote')}</p>
            </div>
          )}

          <p className="text-center text-xs text-text-subtle">{t('pro.freeAlwaysNote')}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
