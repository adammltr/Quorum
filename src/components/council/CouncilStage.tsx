import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CalendarDays, RotateCcw, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { AccountPopover } from '@/components/layout/AccountPopover'
import { SidebarToggle } from '@/components/layout/SidebarToggle'
import { FadeIn } from '@/components/primitives'
import { AssemblyAura } from '@/components/ui/AssemblyAura'
import { getCouncil, councilMode, type CouncilRecord } from '@/lib/account'
import { QuestionComposer } from './QuestionComposer'
import { CouncilAssembly } from './CouncilAssembly'
import { StageStepper } from './StageStepper'
import { Stage2Review } from './Stage2Review'
import { Stage3Verdict } from './Stage3Verdict'
import { TrustBadges } from './TrustBadges'
import { SaveResultPrompt } from './SaveResultPrompt'
import { ShareDialog } from './ShareDialog'
import { usePaywall } from '@/components/billing/use-paywall'
import { useAuth } from '@/components/auth/use-auth'
import { isAdminEmail } from '@/lib/admin'
import { useCouncil, type RunPhase } from '@/hooks/useCouncil'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { QuotaExceeded } from './QuotaExceeded'
import { QuotaCounter } from './QuotaCounter'
import { FREE_TIER } from '@/config/billing'
import { ease } from '@/lib/motion'

/** Libellé de l'étape en cours — discret, en mono. */
function stageLabel(phase: RunPhase, stage: 1 | 2 | 3): string {
  if (phase === 'done') return 'Délibération terminée'
  if (phase === 'error') return 'Délibération interrompue'
  switch (stage) {
    case 1:
      return 'Réponses parallèles'
    case 2:
      return 'Évaluation croisée'
    case 3:
      return 'Synthèse du Chairman'
  }
}

export function CouncilStage(): ReactNode {
  const reduced = useReducedMotion()
  const { phase, stage, runId, models, reviews, borda, verdict, error, errorCode, quota, submit, reset } =
    useCouncil()
  const { openPaywall } = usePaywall()
  const { email, isAuthenticated } = useAuth()
  const isAdmin = isAdminEmail(email)
  const compact = useMediaQuery('(max-width: 639px)')
  const [runKey, setRunKey] = useState(0)
  const [question, setQuestion] = useState('')
  const [savePromptDismissed, setSavePromptDismissed] = useState(false)

  // Council choisi (via /?council=<id>) : assemblée réutilisable de l'utilisateur.
  const [searchParams, setSearchParams] = useSearchParams()
  const councilParam = searchParams.get('council')
  const [council, setCouncil] = useState<CouncilRecord | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!councilParam) {
        setCouncil(null)
        return
      }
      try {
        const c = await getCouncil(councilParam)
        if (!cancelled) setCouncil(c)
      } catch {
        if (!cancelled) setCouncil(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [councilParam])

  const clearCouncil = useCallback(() => {
    setCouncil(null)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('council')
      return next
    })
  }, [setSearchParams])

  const started = phase !== 'idle'
  // Quota atteint : état dédié (page centrée), jamais les skeletons d'IA.
  const showQuota = started && errorCode === 'quota_exceeded'
  const showStage2 = started && !showQuota && stage >= 2
  const showStage3 = started && !showQuota && (stage >= 3 || verdict.consensusScore !== null)
  // Soft paywall : proposé seulement après le 1er verdict rendu (moment de valeur).
  const showSavePrompt =
    phase === 'done' && verdict.consensusScore !== null && !savePromptDismissed

  // Le quota a sa propre page (avec bouton BYOK) → on ne double pas la bannière.
  const paywallHandled = showQuota || errorCode === 'premium_requires_byok'
  // Soft paywall contextuel : sur modèle premium sans BYOK uniquement (le quota
  // est traité par la page dédiée QuotaExceeded). Jamais un blocage sec.
  useEffect(() => {
    if (errorCode === 'premium_requires_byok') openPaywall('premium_model')
  }, [errorCode, openPaywall])

  // Plafond de repli pour la page quota selon le statut (compte vs anonyme).
  const fallbackLimit = isAuthenticated
    ? FREE_TIER.dailyQuestionsAccount
    : FREE_TIER.dailyQuestionsAnon

  // Récit fluide : amène en douceur la nouvelle étape dans le champ de vision.
  const stage2Ref = useRef<HTMLDivElement>(null)
  const stage3Ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (reduced) return // ne pas détourner le scroll si mouvement réduit
    const target = stage === 3 ? stage3Ref.current : stage === 2 ? stage2Ref.current : null
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [stage, reduced])

  const handleSubmit = useCallback(
    (q: string) => {
      setQuestion(q)
      setRunKey((k) => k + 1)
      setSavePromptDismissed(false)
      submit(
        q,
        council
          ? { councilId: council.id, mode: councilMode(council), delegates: council.delegates }
          : undefined,
      )
    },
    [submit, council],
  )

  const handleReset = useCallback(() => {
    setQuestion('')
    setSavePromptDismissed(false)
    reset()
  }, [reset])

  // « Nouvelle question » depuis la sidebar : navigue vers / avec un `fresh`
  // (timestamp) qui force le reset même si l'on est déjà sur l'écran principal.
  const location = useLocation()
  const freshState = (location.state as { fresh?: number } | null)?.fresh
  useEffect(() => {
    if (!freshState) return
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) handleReset()
    })
    return () => {
      cancelled = true
    }
  }, [freshState, handleReset])

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Atmosphère signature — 4 orbes (les délégués de l'assemblée) */}
      <AssemblyAura isRunning={phase !== 'idle'} />

      {/* Barre supérieure — la marque et la navigation vivent dans la sidebar */}
      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        {/* Hamburger masqué sur la page d'accueil vierge — apparaît après soumission */}
        {started ? <SidebarToggle hideWhenOpen /> : <span />}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/_designsystem"
              className="hidden font-mono text-xs text-text-subtle underline-offset-4 hover:text-text-muted hover:underline sm:inline"
            >
              design system
            </Link>
          )}
          <ThemeToggle />
          <AccountPopover variant="avatar" side="bottom" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 pb-12 lg:px-10">
        <AnimatePresence mode="wait" initial={false}>
          {!started ? (
            // ── État initial : composer héroïque centré ──
            <motion.section
              key="hero"
              className="flex flex-1 flex-col items-center justify-center gap-8 text-center lg:gap-12 lg:py-24"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={ease}
            >
              <div className="flex max-w-2xl flex-col items-center gap-4 lg:max-w-4xl lg:gap-6">
                <p className="font-mono text-sm tracking-wider text-text-muted uppercase lg:text-base">
                  Le consensus des intelligences
                </p>
                <h1 className="font-display text-4xl leading-tight text-text sm:text-5xl lg:text-7xl xl:text-8xl">
                  Convoquez l’assemblée.
                </h1>
                {/* Micro-onboarding : 1 ligne, le reste se comprend en regardant */}
                <p className="max-w-md text-lg leading-relaxed text-text-muted lg:max-w-xl lg:text-xl">
                  4 IA répondent, s’évaluent en aveugle, puis tranchent.
                </p>
              </div>
              <div className="flex w-full max-w-2xl flex-col items-center gap-3 lg:max-w-3xl">
                {council && (
                  <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-gold-dim/40 px-3 py-1.5">
                    <Users aria-hidden="true" className="size-3.5 text-gold" />
                    <span className="text-sm text-text">
                      Assemblée : <span className="font-medium">{council.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearCouncil}
                      className="grid size-4 place-items-center rounded-full text-text-muted hover:text-text"
                      aria-label="Retirer le council choisi"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                )}
                {/* Compteur discret du quota du jour (compte connecté non-PRO). */}
                <div className="flex w-full justify-end">
                  <QuotaCounter refreshKey={runKey} />
                </div>
                <QuestionComposer onSubmit={handleSubmit} variant="hero" autoFocus />
                {/* Rendez-vous quotidien — la même question pour tous, chaque jour. */}
                <Link
                  to="/jour"
                  className="mt-8 inline-flex items-center gap-2 font-display text-lg text-text underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  <CalendarDays aria-hidden="true" className="size-5 text-gold" />
                  Ou répondez à la Question du Jour
                </Link>
              </div>
              <div className="mt-12 lg:mt-16">
                <TrustBadges />
              </div>
            </motion.section>
          ) : (
            // ── État actif : question épinglée + assemblée ──
            <motion.section
              key="run"
              className="flex flex-1 flex-col gap-6 pt-2"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={ease}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-3">
                  <h1 className="max-w-3xl font-display text-2xl leading-snug text-text sm:text-3xl">
                    {question}
                  </h1>
                  <StageStepper stage={stage} phase={phase} />
                  {/* Statut textuel pour les lecteurs d'écran */}
                  <span className="sr-only" aria-live="polite">
                    {stageLabel(phase, stage)}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
                  <RotateCcw aria-hidden="true" />
                  Nouvelle question
                </Button>
              </div>

              {error && !paywallHandled && (
                <FadeIn>
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dissent/40 bg-dissent-dim px-5 py-4"
                  >
                    <p className="text-sm text-text">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => handleSubmit(question)}>
                      Réessayer
                    </Button>
                  </div>
                </FadeIn>
              )}

              {/* Quota atteint : page d'état dédiée — pas de cartes IA animées. */}
              {showQuota ? (
                <QuotaExceeded
                  quota={quota}
                  fallbackLimit={fallbackLimit}
                  onByok={() => openPaywall('quota')}
                  onReset={handleReset}
                />
              ) : (
                <CouncilAssembly models={models} runKey={runKey} compact={compact} />
              )}

              {/* Stage 2 — peer-review aveugle */}
              {showStage2 && (
                <div ref={stage2Ref} className="scroll-mt-6">
                  <FadeIn>
                    <Stage2Review models={models} reviews={reviews} borda={borda} />
                  </FadeIn>
                </div>
              )}

              {/* Stage 3 — verdict du Chairman (climax) */}
              {showStage3 && (
                <div ref={stage3Ref} className="scroll-mt-6">
                  <Stage3Verdict verdict={verdict} phase={phase} />
                </div>
              )}

              {/* Après le verdict : partage (gratuit, illimité — jamais derrière le paywall) */}
              {phase === 'done' && verdict.consensusScore !== null && runId && (
                <FadeIn>
                  <div className="flex flex-col items-center gap-2 pt-2 text-center">
                    <ShareDialog
                      runId={runId}
                      question={question}
                      consensusScore={verdict.consensusScore}
                      slots={models.map((m) => m.slot)}
                      borda={borda}
                    />
                    <p className="text-xs text-text-subtle">
                      Une page publique propre — gratuite et illimitée, même sans compte.
                    </p>
                  </div>
                </FadeIn>
              )}

              {/* Après le 1er verdict : proposition de sauvegarde (non intrusive) */}
              {showSavePrompt && runId && (
                <SaveResultPrompt runId={runId} onDismiss={() => setSavePromptDismissed(true)} />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
