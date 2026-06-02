import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Crown, Pencil, Play, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { AppShell } from '@/components/account/AppShell'
import { GlassCard } from '@/components/primitives'
import { Button } from '@/components/ui/button'
import { CouncilComposer } from '@/components/account/CouncilComposer'
import { slotAccent } from '@/components/council/slots'
import { useCouncils } from '@/hooks/useCouncils'
import { useAuth } from '@/components/auth/use-auth'
import { modelLabel } from '@/lib/models-catalog'
import type { CouncilDraft, CouncilRecord } from '@/lib/account'

function CouncilCard({
  council,
  onConvene,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  council: CouncilRecord
  onConvene: (c: CouncilRecord) => void
  onEdit: (c: CouncilRecord) => void
  onDuplicate: (c: CouncilRecord) => void
  onDelete: (id: string) => Promise<void>
}): ReactNode {
  const [confirming, setConfirming] = useState(false)
  return (
    <GlassCard className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-display text-xl leading-snug text-text">{council.name}</h3>
          {council.description && (
            <p className="line-clamp-2 text-sm text-text-muted">{council.description}</p>
          )}
        </div>
        {council.is_preset ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[0.64rem] tracking-wide text-text-subtle uppercase">
            <Sparkles aria-hidden="true" className="size-3" />
            Preset
          </span>
        ) : null}
      </div>

      {/* Délégués */}
      <div className="flex flex-col gap-1.5">
        {council.delegates.map((d) => (
          <div key={d.slot} className="flex items-center gap-2">
            <span
              className="grid size-5 shrink-0 place-items-center rounded font-mono text-[0.64rem]"
              style={{ color: slotAccent(d.slot), border: `1px solid ${slotAccent(d.slot)}` }}
              aria-hidden="true"
            >
              {d.slot}
            </span>
            <span className="truncate text-sm text-text-muted">{d.label || modelLabel(d.model_id)}</span>
          </div>
        ))}
        <div className="mt-0.5 flex items-center gap-2">
          <span className="grid size-5 shrink-0 place-items-center" aria-hidden="true">
            <Crown className="size-3.5 text-gold" />
          </span>
          <span className="truncate font-mono text-xs text-text-subtle">
            {modelLabel(council.chairman_model)}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <Button size="sm" onClick={() => onConvene(council)}>
          <Play aria-hidden="true" />
          Convoquer
        </Button>
        {council.is_preset ? (
          <Button variant="ghost" size="sm" onClick={() => onDuplicate(council)}>
            <Copy aria-hidden="true" />
            Dupliquer
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="icon-sm" aria-label="Modifier" onClick={() => onEdit(council)}>
              <Pencil aria-hidden="true" />
            </Button>
            {confirming ? (
              <span className="flex items-center gap-1">
                <Button variant="destructive" size="xs" onClick={() => void onDelete(council.id)}>
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
                aria-label="Supprimer le council"
                onClick={() => setConfirming(true)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </>
        )}
      </div>
    </GlassCard>
  )
}

export function Councils(): ReactNode {
  const navigate = useNavigate()
  const { isPro } = useAuth()
  const { presets, mine, loading, error, atLimit, limit, create, update, remove } = useCouncils()
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<CouncilRecord | null>(null)

  const convene = (c: CouncilRecord) => navigate(`/?council=${c.id}`)

  const openNew = () => {
    setEditing(null)
    setComposerOpen(true)
  }
  const openEdit = (c: CouncilRecord) => {
    setEditing(c)
    setComposerOpen(true)
  }
  const openDuplicate = (c: CouncilRecord) => {
    setEditing(c) // le compositeur préfixe « (copie) » pour un preset
    setComposerOpen(true)
  }

  const handleSave = async (draft: CouncilDraft) => {
    if (editing && !editing.is_preset) await update(editing.id, draft)
    else await create(draft)
  }

  return (
    <AppShell
      title="Councils"
      subtitle="Compose ton assemblée idéale, donne-lui un nom, réutilise-la. Pars d’un preset ou de zéro."
      action={
        <Button onClick={openNew} disabled={atLimit}>
          <Plus aria-hidden="true" />
          Composer
        </Button>
      }
    >
      {atLimit && (
        <p className="text-sm text-text-muted">
          Tu as atteint ta limite de {limit} council{limit > 1 ? 's' : ''} perso.{' '}
          {!isPro && <span className="text-gold">Passe en PRO</span>}
          {!isPro && ' pour en composer jusqu’à 10.'}
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
            <div key={i} className="skeleton-line h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Mes councils */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Users aria-hidden="true" className="size-4 text-text-muted" />
              <h2 className="font-mono text-xs tracking-wide text-text-muted uppercase">Mes councils</h2>
            </div>
            {mine.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm text-text-muted">
                  Aucun council perso. Duplique un preset ci-dessous ou compose le tien.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mine.map((c) => (
                  <CouncilCard
                    key={c.id}
                    council={c}
                    onConvene={convene}
                    onEdit={openEdit}
                    onDuplicate={openDuplicate}
                    onDelete={remove}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Presets à caractère */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-4 text-text-muted" />
              <h2 className="font-mono text-xs tracking-wide text-text-muted uppercase">
                Assemblées prêtes à l’emploi
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((c) => (
                <CouncilCard
                  key={c.id}
                  council={c}
                  onConvene={convene}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onDelete={remove}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <CouncilComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        initial={editing}
        isPro={isPro}
        onSave={handleSave}
      />
    </AppShell>
  )
}
