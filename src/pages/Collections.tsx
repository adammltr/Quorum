import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Dialog } from 'radix-ui'
import { ArrowLeft, FolderOpen, FolderPlus, Globe, Lock, Trash2, X } from 'lucide-react'
import { AppShell } from '@/components/account/AppShell'
import { HistoryCard } from '@/components/account/HistoryCard'
import { GlassCard } from '@/components/primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCollections } from '@/hooks/useCollections'
import {
  listCollectionRuns,
  removeRunFromCollection,
  setCollectionPublic,
  type CollectionSummary,
  type HistoryItem,
} from '@/lib/account'

// ─── Détail d'une collection ────────────────────────────────────────────────

function CollectionDetail({ id }: { id: string }): ReactNode {
  const { collections } = useCollections()
  const summary = collections.find((c) => c.id === id)
  const [runs, setRuns] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  // État public : override optimiste local au-dessus de la valeur serveur.
  const [publicOverride, setPublicOverride] = useState<boolean | null>(null)
  const isPublic = publicOverride ?? summary?.is_public ?? false

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const rows = await listCollectionRuns(id)
        if (!cancelled) setRuns(rows)
      } catch {
        /* best-effort */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const togglePublic = async () => {
    const next = !isPublic
    setPublicOverride(next)
    try {
      await setCollectionPublic(id, next)
    } catch {
      setPublicOverride(!next)
    }
  }

  const unpin = async (runId: string) => {
    await removeRunFromCollection(id, runId)
    setRuns((prev) => prev.filter((r) => r.id !== runId))
  }

  return (
    <AppShell
      title={summary?.name ?? 'Collection'}
      subtitle={summary?.description ?? undefined}
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void togglePublic()}>
            {isPublic ? <Globe aria-hidden="true" /> : <Lock aria-hidden="true" />}
            {isPublic ? 'Publique' : 'Privée'}
          </Button>
        </div>
      }
    >
      <Link
        to="/collections"
        className="inline-flex w-fit items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Toutes les collections
      </Link>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-line h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-display text-xl text-text">Collection vide</p>
          <p className="mt-1 text-sm text-text-muted">
            Épingle une délibération depuis ton historique pour la ranger ici.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {runs.map((item) => (
            <HistoryCard key={item.id} item={item} onRemove={unpin} hidePin />
          ))}
        </div>
      )}
    </AppShell>
  )
}

// ─── Création de collection ─────────────────────────────────────────────────

function NewCollectionDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreate: (name: string, description: string) => Promise<void>
}): ReactNode {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(name, description)
      setName('')
      setDescription('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-xl text-text">Nouvelle collection</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              autoFocus
              placeholder="Nom (ex. « Décisions produit »)"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              placeholder="Description (optionnelle)"
              rows={2}
              maxLength={280}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm text-dissent">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !name.trim()} className="self-end">
              Créer la collection
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CollectionCard({
  collection,
  onDelete,
}: {
  collection: CollectionSummary
  onDelete: (id: string) => Promise<void>
}): ReactNode {
  const [confirming, setConfirming] = useState(false)
  return (
    <GlassCard className="group flex flex-col gap-3 p-5">
      <Link to={`/collections/${collection.id}`} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <FolderOpen aria-hidden="true" className="size-5 text-gold" />
          {collection.is_public ? (
            <Globe aria-hidden="true" className="size-3.5 text-text-subtle" />
          ) : (
            <Lock aria-hidden="true" className="size-3.5 text-text-subtle" />
          )}
        </div>
        <h3 className="font-display text-xl leading-snug text-text">{collection.name}</h3>
        {collection.description && (
          <p className="line-clamp-2 text-sm text-text-muted">{collection.description}</p>
        )}
      </Link>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="font-mono text-xs text-text-subtle">
          {collection.item_count} {collection.item_count > 1 ? 'délibérations' : 'délibération'}
        </span>
        {confirming ? (
          <span className="flex items-center gap-1">
            <Button variant="destructive" size="xs" onClick={() => void onDelete(collection.id)}>
              Supprimer
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Supprimer la collection"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>
    </GlassCard>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Collections(): ReactNode {
  const { id } = useParams()
  const { collections, loading, error, atLimit, create, remove } = useCollections()
  const [newOpen, setNewOpen] = useState(false)

  if (id) return <CollectionDetail id={id} />

  return (
    <AppShell
      title="Collections"
      subtitle="Range tes délibérations dans des dossiers nommés. Privées par défaut, partageables."
      action={
        <Button onClick={() => setNewOpen(true)} disabled={atLimit}>
          <FolderPlus aria-hidden="true" />
          Nouvelle collection
        </Button>
      }
    >
      {atLimit && (
        <p className="text-sm text-text-muted">
          Plan gratuit : 2 collections maximum.{' '}
          <span className="text-gold">Passe en PRO</span> pour un nombre illimité.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-dissent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-line h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <FolderOpen aria-hidden="true" className="size-8 text-text-subtle" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-xl text-text">Aucune collection</p>
            <p className="text-sm text-text-muted">
              Crée ta première collection pour organiser tes verdicts.
            </p>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <FolderPlus aria-hidden="true" />
            Nouvelle collection
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} onDelete={remove} />
          ))}
        </div>
      )}

      <NewCollectionDialog open={newOpen} onOpenChange={setNewOpen} onCreate={create} />
    </AppShell>
  )
}
