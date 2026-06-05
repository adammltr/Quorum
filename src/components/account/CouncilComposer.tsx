import { useState, type FormEvent, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import { Crown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelect } from './ModelSelect'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { usePaywall } from '@/components/billing/use-paywall'
import { useAuth } from '@/components/auth/use-auth'
import { slotAccent } from '@/components/council/slots'
import { cn } from '@/lib/utils'
import { COUNCIL_SLOTS, FREE_MODELS, modelLabel } from '@/lib/models-catalog'
import type { CouncilDraft, CouncilRecord } from '@/lib/account'
import type { Delegate } from '@/lib/db-helpers'

interface CouncilComposerProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Council à éditer (ou à dupliquer depuis un preset). null = nouveau. */
  initial?: CouncilRecord | null
  isPro: boolean
  onSave: (draft: CouncilDraft) => Promise<void>
}

function defaultDelegates(): Delegate[] {
  return COUNCIL_SLOTS.map((slot, i) => {
    const model = FREE_MODELS[i % FREE_MODELS.length] ?? FREE_MODELS[0]!
    return { slot, model_id: model.id, label: model.label }
  })
}

/** Compose une assemblée sur-mesure : 4 délégués + un Chairman. */
export function CouncilComposer({
  open,
  onOpenChange,
  initial,
  isPro,
  onSave,
}: CouncilComposerProps): ReactNode {
  const { t } = useTranslation()
  const [name, setName] = useState(
    initial ? `${initial.name}${initial.is_preset ? t('councilComposer.copySuffix') : ''}` : '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [delegates, setDelegates] = useState<Delegate[]>(initial?.delegates ?? defaultDelegates())
  const [chairman, setChairman] = useState(initial?.chairman_model ?? FREE_MODELS[0]!.id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { openPaywall } = usePaywall()
  const { isAuthenticated } = useAuth()

  const setSlotModel = (slot: string, modelId: string) => {
    setDelegates((prev) =>
      prev.map((d) => (d.slot === slot ? { ...d, model_id: modelId, label: modelLabel(modelId) } : d)),
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onSave({ name, description, delegates, chairman_model: chairman })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('councilComposer.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-2xl leading-snug text-text">
                {initial && !initial.is_preset ? t('councilComposer.editTitle') : t('councilComposer.createTitle')}
              </Dialog.Title>
              <p className="text-sm text-text-muted">{t('councilComposer.subtitle')}</p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('common.close')}>
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            {/* Gating : composer/sauvegarder une assemblée requiert un compte. */}
            {!isAuthenticated && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/30 bg-gold/10 p-3">
                <p className="text-sm text-text">
                  🔐 {t('councils.signInToCompose')}
                </p>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="text-sm font-medium text-gold underline-offset-4 hover:underline"
                >
                  {t('nav.signIn')}
                </button>
              </div>
            )}

            <div className={cn('flex flex-col gap-5', !isAuthenticated && 'pointer-events-none opacity-50')}>
            <div className="flex flex-col gap-2">
              <label htmlFor="council-name" className="font-mono text-xs tracking-wide text-text-muted uppercase">
                {t('councilComposer.nameLabel')}
              </label>
              <Input
                id="council-name"
                autoFocus
                disabled={!isAuthenticated}
                placeholder={t('councilComposer.namePlaceholder')}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="council-desc" className="font-mono text-xs tracking-wide text-text-muted uppercase">
                {t('councilComposer.intentionLabel')} <span className="normal-case text-text-subtle">{t('councilComposer.optional')}</span>
              </label>
              <Textarea
                id="council-desc"
                rows={2}
                maxLength={280}
                disabled={!isAuthenticated}
                placeholder={t('councilComposer.intentionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs tracking-wide text-text-muted uppercase">
                {t('councilComposer.delegates')}
              </span>
              {delegates.map((d) => (
                <div key={d.slot} className="flex items-center gap-3">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md font-mono text-xs font-medium"
                    style={{ background: 'var(--surface)', color: slotAccent(d.slot), border: `1px solid ${slotAccent(d.slot)}` }}
                    aria-hidden="true"
                  >
                    {d.slot}
                  </span>
                  <div className="flex-1">
                    <ModelSelect
                      value={d.model_id}
                      onChange={(m) => setSlotModel(d.slot, m)}
                      isPro={isPro}
                      label={t('councilComposer.delegateModelLabel', { slot: d.slot })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-text-muted uppercase">
                <Crown aria-hidden="true" className="size-3.5 text-gold" />
                Chairman <span className="normal-case text-text-subtle">{t('councilComposer.chairmanHint')}</span>
              </span>
              <ModelSelect value={chairman} onChange={setChairman} isPro={isPro} label={t('councilComposer.chairmanModelLabel')} />
            </div>
            </div>

            {isAuthenticated && !isPro && (
              <p className="text-xs text-text-subtle">
                {t('councilComposer.premiumNote')}{' '}
                <button
                  type="button"
                  onClick={() => openPaywall('premium_model')}
                  className="text-gold underline-offset-4 hover:underline"
                >
                  {t('councilComposer.discoverPro')}
                </button>
                .
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-dissent">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  {t('common.cancel')}
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={busy || !name.trim() || !isAuthenticated}>
                {!isAuthenticated
                  ? t('councilComposer.signInRequired')
                  : initial && !initial.is_preset
                    ? t('councilComposer.save')
                    : t('councilComposer.create')}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </Dialog.Root>
  )
}
