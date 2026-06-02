import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { Check, FolderPlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addRunToCollection,
  collectionsContainingRun,
  removeRunFromCollection,
} from '@/lib/account'
import { useCollections } from '@/hooks/useCollections'
import { track } from '@/lib/analytics'

interface AddToCollectionDialogProps {
  runId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Épingle un run dans une ou plusieurs collections (toggle), avec création rapide. */
export function AddToCollectionDialog({
  runId,
  open,
  onOpenChange,
}: AddToCollectionDialogProps): ReactNode {
  const { collections, create, atLimit, reload } = useCollections()
  const [member, setMember] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [loadingMembership, setLoadingMembership] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      setLoadingMembership(true)
      try {
        const set = await collectionsContainingRun(runId)
        if (!cancelled) setMember(set)
      } catch {
        /* membership best-effort */
      } finally {
        if (!cancelled) setLoadingMembership(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, runId])

  const toggle = async (collectionId: string) => {
    setBusy(collectionId)
    setError(null)
    try {
      if (member.has(collectionId)) {
        await removeRunFromCollection(collectionId, runId)
        setMember((prev) => {
          const next = new Set(prev)
          next.delete(collectionId)
          return next
        })
      } else {
        await addRunToCollection(collectionId, runId)
        setMember((prev) => new Set(prev).add(collectionId))
        track('run_pinned', { collection_id: collectionId })
      }
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setBusy(null)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      await create(name)
      setNewName('')
      setCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[80vh] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl leading-snug text-text">
              Épingler dans une collection
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {loadingMembership ? (
              <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Chargement…
              </div>
            ) : collections.length === 0 ? (
              <p className="py-4 text-sm text-text-muted">
                Aucune collection pour l’instant. Crée-en une ci-dessous.
              </p>
            ) : (
              collections.map((c) => {
                const isMember = member.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => void toggle(c.id)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-border-bright disabled:opacity-60"
                  >
                    <span className="min-w-0 truncate text-sm text-text">{c.name}</span>
                    <span
                      className={
                        'grid size-5 shrink-0 place-items-center rounded-md border transition-colors ' +
                        (isMember ? 'border-gold bg-gold text-[oklch(18%_0.03_70)]' : 'border-border')
                      }
                      aria-hidden="true"
                    >
                      {busy === c.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : isMember ? (
                        <Check className="size-3.5" />
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-dissent">
              {error}
            </p>
          )}

          {creating ? (
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder="Nom de la collection"
                value={newName}
                maxLength={80}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={!newName.trim()}>
                Créer
              </Button>
            </form>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled={atLimit}
              onClick={() => setCreating(true)}
            >
              <FolderPlus aria-hidden="true" />
              Nouvelle collection
            </Button>
          )}
          {atLimit && !creating && (
            <p className="text-xs text-text-subtle">
              Plan gratuit : 2 collections max. Passe en PRO pour un nombre illimité.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
