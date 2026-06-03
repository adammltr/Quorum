import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { FadeIn } from '@/components/primitives'
import { CouncilAssembly } from '@/components/council/CouncilAssembly'
import { Stage2Review } from '@/components/council/Stage2Review'
import { Stage3Verdict } from '@/components/council/Stage3Verdict'
import { ShareDialog } from '@/components/council/ShareDialog'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { ModelState, ReviewState, SlotPhase, VerdictState } from '@/hooks/useCouncil'
import { fetchOwnedRun, type PublicRunBundle } from '@/lib/public-run'
import { formatRelativeDate } from '@/lib/utils'

/**
 * Page d'un résultat complet d'un run détenu (/run/{runId}).
 *
 * Accessible depuis l'historique (cartes cliquables). Reconstitue la
 * délibération en lecture seule — mêmes composants que la page publique
 * (CouncilAssembly, Stage2Review, Stage3Verdict) pour une cohérence visuelle
 * totale. La RLS owner-only garantit qu'on ne charge que ses propres runs.
 */

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; bundle: PublicRunBundle }
  | { kind: 'notfound' }
  | { kind: 'error' }

function mapPhase(status: string): SlotPhase {
  if (status === 'complete' || status === 'error' || status === 'timeout') return status
  return 'complete'
}

export function RunResult(): ReactNode {
  const { runId } = useParams<{ runId: string }>()
  const compact = useMediaQuery('(max-width: 639px)')
  const [load, setLoad] = useState<Load>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!runId) {
        setLoad({ kind: 'notfound' })
        return
      }
      setLoad({ kind: 'loading' })
      try {
        const bundle = await fetchOwnedRun(runId)
        if (cancelled) return
        setLoad(bundle ? { kind: 'ready', bundle } : { kind: 'notfound' })
      } catch {
        if (!cancelled) setLoad({ kind: 'error' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [runId])

  const bundle = load.kind === 'ready' ? load.bundle : null

  useEffect(() => {
    if (bundle) document.title = `${bundle.question} — Quorum`
    return () => {
      document.title = 'Quorum — Le consensus des intelligences'
    }
  }, [bundle])

  const labelOf = useMemo(() => {
    const map = new Map<string, string>()
    bundle?.run.council_snapshot.delegates.forEach((d) => map.set(d.slot, d.label))
    return (slot: string) => map.get(slot) ?? `Modèle ${slot}`
  }, [bundle])

  const models: ModelState[] = useMemo(() => {
    if (!bundle) return []
    return bundle.responses.map((r) => ({
      slot: r.slot,
      modelId: r.model_id,
      label: labelOf(r.slot),
      content: r.content ?? '',
      phase: mapPhase(r.status),
      error:
        r.status === 'error' || r.status === 'timeout'
          ? 'Ce modèle n’a pas pu répondre. L’assemblée a poursuivi sans lui.'
          : undefined,
      latencyMs: r.latency_ms ?? undefined,
    }))
  }, [bundle, labelOf])

  const reviews: ReviewState[] = useMemo(
    () => bundle?.reviews.map((r) => ({ reviewerSlot: r.reviewer_slot, parseOk: true })) ?? [],
    [bundle],
  )

  const verdict: VerdictState | null = useMemo(() => {
    if (!bundle?.verdict) return null
    return {
      body: bundle.verdict.body,
      consensusScore: bundle.verdict.consensus_score,
      disagreements: bundle.verdict.disagreements,
    }
  }, [bundle])

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Atmosphère — lueur ambre discrète */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-1/4 left-1/2 h-[55vh] w-[80vw] max-w-[60rem] -translate-x-1/2 rounded-full bg-gold-dim blur-[140px]" />
      </div>

      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 font-mono text-sm text-text-muted underline-offset-4 transition-colors hover:text-text"
          aria-label="Retour à l’historique"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Historique
        </Link>
        <div className="flex items-center gap-3">
          {bundle && (
            <ShareDialog
              variant="inline"
              runId={bundle.run.id}
              question={bundle.question}
              consensusScore={bundle.verdict?.consensus_score ?? null}
              slots={models.map((m) => m.slot)}
              borda={bundle.verdict?.borda_scores ?? null}
            />
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 pb-16 lg:px-10">
        {load.kind === 'loading' && (
          <div className="flex flex-1 items-center justify-center gap-2 text-text-muted">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            <span className="font-mono text-sm">Chargement de la délibération…</span>
          </div>
        )}

        {load.kind === 'notfound' && (
          <EmptyState
            title="Délibération introuvable"
            body="Ce run n’existe plus ou ne t’appartient pas."
          />
        )}

        {load.kind === 'error' && (
          <EmptyState
            title="Impossible de charger cette délibération"
            body="Réessaie dans un instant."
          />
        )}

        {load.kind === 'ready' && bundle && (
          <FadeIn>
            <div className="flex flex-col gap-6 pt-2">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs tracking-wider text-text-muted uppercase">
                  Délibération de l’assemblée · {formatRelativeDate(bundle.run.created_at)}
                </span>
                <h1 className="max-w-3xl font-display text-3xl leading-snug text-text sm:text-4xl">
                  {bundle.question}
                </h1>
              </div>

              <CouncilAssembly models={models} runKey={0} compact={compact} />

              {reviews.length > 0 && (
                <Stage2Review
                  models={models}
                  reviews={reviews}
                  borda={bundle.verdict?.borda_scores ?? null}
                />
              )}

              {verdict && <Stage3Verdict verdict={verdict} phase="done" />}

              <FadeIn>
                <div className="mt-2 flex flex-col items-center gap-3 pt-2 text-center">
                  <Button asChild>
                    <Link to="/">
                      Poser une nouvelle question
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            </div>
          </FadeIn>
        )}
      </main>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-3xl text-text">{title}</h1>
      <p className="max-w-md text-text-muted">{body}</p>
      <Button asChild>
        <Link to="/history">Retour à l’historique</Link>
      </Button>
    </div>
  )
}
