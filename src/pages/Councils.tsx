import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Copy, Crown, Lock, Pencil, Play, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { AppShell } from '@/components/account/AppShell'
import { GlassCard } from '@/components/primitives'
import { Button } from '@/components/ui/button'
import { CouncilComposer } from '@/components/account/CouncilComposer'
import { slotAccent } from '@/components/council/slots'
import { useCouncils } from '@/hooks/useCouncils'
import { useAuth } from '@/components/auth/use-auth'
import { usePaywall } from '@/components/billing/use-paywall'
import { modelLabel } from '@/lib/models-catalog'
import { easeMedium } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CouncilDraft, CouncilRecord } from '@/lib/account'

function CouncilCard({
  council,
  onConvene,
  onEdit,
  onDuplicate,
  onDelete,
  locked = false,
  onUnlock,
}: {
  council: CouncilRecord
  onConvene: (c: CouncilRecord) => void
  onEdit: (c: CouncilRecord) => void
  onDuplicate: (c: CouncilRecord) => void
  onDelete: (id: string) => Promise<void>
  /** Carte d'assemblée premium verrouillée (PRO). */
  locked?: boolean
  onUnlock?: () => void
}): ReactNode {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const reduced = useReducedMotion()
  const hasDescription = Boolean(council.description)
  // Toute la carte est cliquable pour déplier/replier la description.
  const toggle = () => {
    if (hasDescription) setExpanded((v) => !v)
  }
  // Empêche le clic d'un bouton d'action de (dé)plier la carte.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <GlassCard
      onClick={toggle}
      className={cn(
        'flex flex-col gap-4 p-5 transition-transform duration-200 hover:border-gold/50',
        hasDescription && 'cursor-pointer',
        locked ? 'opacity-50' : 'hover:scale-[1.02]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-display text-xl leading-snug text-text">{council.name}</h3>
          {hasDescription && (
            <>
              {/* Aperçu tronqué — la carte entière déplie la description complète. */}
              {!expanded && (
                <p className="line-clamp-2 text-sm text-text-muted transition-colors">
                  {council.description}
                </p>
              )}
              {/* Accordéon animé (Motion, pas de modal). */}
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="desc"
                    className="overflow-hidden"
                    initial={reduced ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={easeMedium}
                  >
                    <div className="flex items-start gap-2 pt-1">
                      <p className="flex-1 text-sm leading-relaxed text-text-muted">
                        {council.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
        {locked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 font-mono text-[0.64rem] tracking-wide text-gold uppercase">
            PRO
          </span>
        ) : council.is_preset ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[0.64rem] tracking-wide text-text-subtle uppercase">
            <Sparkles aria-hidden="true" className="size-3" />
            {t('councils.preset')}
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
        {locked ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              stop(e)
              onUnlock?.()
            }}
          >
            <Lock aria-hidden="true" />
            {t('councils.unlockPro')}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              onClick={(e) => {
                stop(e)
                onConvene(council)
              }}
            >
              <Play aria-hidden="true" />
              {t('councils.convene')}
            </Button>
            {council.is_preset ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  stop(e)
                  onDuplicate(council)
                }}
              >
                <Copy aria-hidden="true" />
                {t('councils.duplicate')}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('councils.edit')}
                  onClick={(e) => {
                    stop(e)
                    onEdit(council)
                  }}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                {confirming ? (
                  <span className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={(e) => {
                        stop(e)
                        void onDelete(council.id)
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        stop(e)
                        setConfirming(false)
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('councils.deleteCouncil')}
                    onClick={(e) => {
                      stop(e)
                      setConfirming(true)
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </GlassCard>
  )
}

/** Assemblées premium — vitrine verrouillée (débloquées en PRO). Statique, non convocable. */
const LOCKED_COUNCILS: readonly CouncilRecord[] = [
  {
    id: 'locked-olympe',
    owner_id: null,
    name: 'L’Olympe',
    description:
      'L’assemblée des géants — quatre intelligences de pointe pour les décisions qui comptent vraiment.',
    delegates: [
      { slot: 'A', model_id: 'openai/gpt-4o', label: 'GPT-4o' },
      { slot: 'B', model_id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4' },
      { slot: 'C', model_id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { slot: 'D', model_id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' },
    ],
    chairman_model: 'anthropic/claude-sonnet-4-5',
    is_preset: true,
    is_default: false,
    created_at: '',
  },
  {
    id: 'locked-cabinet',
    owner_id: null,
    name: 'Le Cabinet Stratégique',
    description:
      'Analyse stratégique multi-perspective. Pour les vraies décisions business, technique ou créative.',
    delegates: [
      { slot: 'A', model_id: 'openai/gpt-4o', label: 'GPT-4o' },
      { slot: 'B', model_id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4' },
      { slot: 'C', model_id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { slot: 'D', model_id: 'x-ai/grok-2', label: 'Grok 2' },
    ],
    chairman_model: 'openai/gpt-4o',
    is_preset: true,
    is_default: false,
    created_at: '',
  },
]

export function Councils(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isPro } = useAuth()
  const { openPaywall } = usePaywall()
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
      title={t('nav.councils')}
      subtitle={t('councils.subtitle')}
      action={
        <Button onClick={openNew} disabled={atLimit}>
          <Plus aria-hidden="true" />
          {t('councils.compose')}
        </Button>
      }
    >
      {atLimit && (
        <p className="text-sm text-text-muted">
          {t('councils.atLimit', { count: limit })}{' '}
          {!isPro && <span className="text-gold">{t('councils.upgradeForMore')}</span>}
          {!isPro && t('councils.upgradeForMoreSuffix')}
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
              <h2 className="font-mono text-xs tracking-wide text-text-muted uppercase">{t('councils.mine')}</h2>
            </div>
            {mine.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm text-text-muted">{t('councils.emptyMine')}</p>
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
                {t('councils.readyMade')}
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

          {/* Assemblées premium — verrouillées, débloquées en PRO */}
          <section className="flex flex-col gap-4">
            <div className="border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <Crown aria-hidden="true" className="size-4 text-gold" />
                <h2 className="font-mono text-xs tracking-wide text-text-muted uppercase">
                  {t('councils.premium')}
                </h2>
              </div>
              <p className="mt-1 font-mono text-xs tracking-wider text-text-subtle uppercase">
                {t('councils.premiumNote')}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LOCKED_COUNCILS.map((c) => (
                <CouncilCard
                  key={c.id}
                  council={c}
                  onConvene={convene}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onDelete={remove}
                  locked
                  onUnlock={() => openPaywall('premium_model')}
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
