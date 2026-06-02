import { useState, type FormEvent, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Crown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelect } from './ModelSelect'
import { usePaywall } from '@/components/billing/use-paywall'
import { slotAccent } from '@/components/council/slots'
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
  const [name, setName] = useState(initial ? `${initial.name}${initial.is_preset ? ' (copie)' : ''}` : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [delegates, setDelegates] = useState<Delegate[]>(initial?.delegates ?? defaultDelegates())
  const [chairman, setChairman] = useState(initial?.chairman_model ?? FREE_MODELS[0]!.id)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { openPaywall } = usePaywall()

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
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
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
                {initial && !initial.is_preset ? 'Modifier le council' : 'Composer un council'}
              </Dialog.Title>
              <p className="text-sm text-text-muted">
                Quatre délégués délibèrent, un Chairman tranche.
              </p>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="council-name" className="font-mono text-xs tracking-wide text-text-muted uppercase">
                Nom
              </label>
              <Input
                id="council-name"
                autoFocus
                placeholder="ex. « Les Stratèges »"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="council-desc" className="font-mono text-xs tracking-wide text-text-muted uppercase">
                Intention <span className="normal-case text-text-subtle">(optionnelle)</span>
              </label>
              <Textarea
                id="council-desc"
                rows={2}
                maxLength={280}
                placeholder="Quel tempérament pour cette assemblée ?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-xs tracking-wide text-text-muted uppercase">
                Délégués
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
                      label={`Modèle du délégué ${d.slot}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-text-muted uppercase">
                <Crown aria-hidden="true" className="size-3.5 text-gold" />
                Chairman <span className="normal-case text-text-subtle">— la synthèse finale</span>
              </span>
              <ModelSelect value={chairman} onChange={setChairman} isPro={isPro} label="Modèle Chairman" />
            </div>

            {!isPro && (
              <p className="text-xs text-text-subtle">
                Les modèles premium sont réservés au plan PRO. En gratuit, compose avec les modèles
                ouverts —{' '}
                <button
                  type="button"
                  onClick={() => openPaywall('premium_model')}
                  className="text-gold underline-offset-4 hover:underline"
                >
                  découvrir PRO
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
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={busy || !name.trim()}>
                {initial && !initial.is_preset ? 'Enregistrer' : 'Créer le council'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
