import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { FadeIn } from '@/components/primitives'
import { CouncilAssembly } from '@/components/council/CouncilAssembly'
import { Stage2Review } from '@/components/council/Stage2Review'
import { Stage3Verdict } from '@/components/council/Stage3Verdict'
import { ShareDialog } from '@/components/council/ShareDialog'
import { SidebarToggle } from '@/components/layout/SidebarToggle'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { ModelState, ReviewState, SlotPhase, VerdictState } from '@/hooks/useCouncil'
import { fetchSharedRun, type PublicRunBundle } from '@/lib/public-run'
import { track } from '@/lib/analytics'

/**
 * Page publique d'un résultat partagé (/q/{slug}).
 *
 * Rendue côté serveur pour les balises OG/SEO (api/share.ts), puis hydratée :
 * ce composant charge le bundle public via `get_shared_run` et reconstitue la
 * délibération en lecture seule (réponses, votes, verdict). Un CTA discret mais
 * clair « Pose ta propre question » referme la boucle virale.
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

export function PublicResult(): ReactNode {
  const { slug } = useParams<{ slug: string }>()
  const compact = useMediaQuery('(max-width: 639px)')
  const [load, setLoad] = useState<Load>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!slug) {
        setLoad({ kind: 'notfound' })
        return
      }
      setLoad({ kind: 'loading' })
      try {
        const bundle = await fetchSharedRun(slug)
        if (cancelled) return
        if (!bundle) {
          setLoad({ kind: 'notfound' })
          return
        }
        setLoad({ kind: 'ready', bundle })
        track('public_view', { slug })
      } catch {
        if (!cancelled) setLoad({ kind: 'error' })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Titre humain (le SSR pose déjà les balises pour les crawlers).
  useEffect(() => {
    if (load.kind === 'ready') {
      document.title = `${load.bundle.question} — Quorum`
    }
    return () => {
      document.title = 'Quorum — Le consensus des intelligences'
    }
  }, [load])

  const bundle = load.kind === 'ready' ? load.bundle : null

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
        <SidebarToggle hideWhenOpen />
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
            title="Cette délibération est introuvable"
            body="Le lien est peut-être expiré ou le partage a été révoqué."
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
                  Délibération de l’assemblée
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

              {/* CTA — referme la boucle virale */}
              <FadeIn>
                <div className="mt-2 flex flex-col items-center gap-4 rounded-2xl border border-gold/20 bg-surface/50 px-6 py-10 text-center">
                  <p className="font-display text-2xl leading-snug text-text sm:text-3xl">
                    Et toi, qu’en penseraient 4 IA ?
                  </p>
                  <p className="max-w-md text-base text-text-muted">
                    Pose ta propre question — réponse de l’assemblée en moins d’une minute, sans
                    compte.
                  </p>
                  <Button size="lg" asChild className="bg-gold text-[oklch(18%_0.03_70)] hover:bg-gold/90">
                    <Link to="/" onClick={() => track('public_cta_click', { slug })}>
                      Pose ta propre question
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
        <Link to="/">Poser une question</Link>
      </Button>
    </div>
  )
}
