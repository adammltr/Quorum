import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'
import { Archive, CalendarDays, RotateCcw, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { AccountMenu } from '@/components/account/AccountMenu'
import { FadeIn } from '@/components/primitives'
import { CouncilAssembly } from '@/components/council/CouncilAssembly'
import { StageStepper } from '@/components/council/StageStepper'
import { Stage2Review } from '@/components/council/Stage2Review'
import { Stage3Verdict } from '@/components/council/Stage3Verdict'
import { DailyResultPanel } from '@/components/daily/DailyResultPanel'
import { getCouncil, councilMode, type CouncilRecord } from '@/lib/account'
import {
  getDailyQuestion,
  recordDailyParticipation,
  formatDayFr,
  hasParticipatedLocally,
  isPastDay,
  isValidDay,
  todayUtc,
  type DailyBundle,
  type DailyResult,
} from '@/lib/daily'
import { useCouncil } from '@/hooks/useCouncil'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { track } from '@/lib/analytics'
import { ease } from '@/lib/motion'

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; bundle: DailyBundle }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }

/**
 * Seuil d'amorçage social : en dessous, la participation réelle (souvent 1 au
 * lancement) casserait la preuve sociale. On affiche alors un nombre « crédible »
 * dérivé de façon déterministe du jour (stable sur 24 h, varie chaque jour).
 */
const MOCK_THRESHOLD = 50

/** Quantième du jour (1–366) à partir d'une date « YYYY-MM-DD » (UTC). */
function dayOfYear(day: string): number {
  const d = new Date(`${day}T00:00:00Z`)
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  return Math.floor((d.getTime() - start) / 86_400_000)
}

/** Participations affichées : réelles si crédibles, sinon amorçage déterministe. */
function displayParticipations(realCount: number, day: string): number {
  if (realCount >= MOCK_THRESHOLD) return realCount
  return ((dayOfYear(day) * 7 + 142) % 300) + 50
}

/** Consensus mondial affiché : réel si assez de participants, sinon mock stable. */
function displayConsensus(realCount: number, realConsensus: number | null, day: string): number | null {
  if (realCount >= MOCK_THRESHOLD) return realConsensus
  return (dayOfYear(day) % 20) + 55
}

/**
 * Question du Jour (SPEC §5) — le rendez-vous quotidien qui crée l'habitude.
 *
 * Une question unique par jour, la même pour tous. On convoque l'assemblée
 * dessus, puis on situe son résultat face au consensus mondial (comparaison
 * sociale légère), on partage une grille façon Wordle et on entretient un
 * streak éthique. Route : /jour (aujourd'hui) et /jour/:day (archive).
 */
export function DailyQuestion(): ReactNode {
  const reduced = useReducedMotion()
  const { day: dayParam } = useParams()
  const day = dayParam && isValidDay(dayParam) ? dayParam : todayUtc()
  const past = isPastDay(day)

  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [council, setCouncil] = useState<CouncilRecord | null>(null)
  const [result, setResult] = useState<DailyResult | null>(null)
  const [runKey, setRunKey] = useState(0)
  const compact = useMediaQuery('(max-width: 639px)')

  const { phase, stage, runId, models, reviews, borda, verdict, error, submit, reset } = useCouncil()

  // Charge la QdJ + le council officiel (pour le rendu optimiste + le mode).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoad({ kind: 'loading' })
      setResult(null)
      reset()
      try {
        const bundle = await getDailyQuestion(day)
        if (cancelled) return
        if (!bundle) {
          setLoad({ kind: 'missing' })
          return
        }
        setLoad({ kind: 'ready', bundle })
        if (bundle.councilId) {
          try {
            const c = await getCouncil(bundle.councilId)
            if (!cancelled) setCouncil(c)
          } catch {
            if (!cancelled) setCouncil(null)
          }
        }
      } catch (err) {
        if (cancelled) return
        setLoad({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Question du jour indisponible.',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [day, reset])

  const handleConvoke = useCallback(() => {
    if (load.kind !== 'ready') return
    track('daily_convoked', { day })
    setRunKey((k) => k + 1)
    submit(
      load.bundle.question,
      council
        ? { councilId: council.id, mode: councilMode(council), delegates: council.delegates }
        : undefined,
    )
  }, [load, council, submit, day])

  // Enregistre la participation une fois le verdict rendu (idempotent serveur).
  const recordedFor = useRef<string | null>(null)
  useEffect(() => {
    if (phase !== 'done' || verdict.consensusScore === null || !runId) return
    if (recordedFor.current === runId) return
    recordedFor.current = runId
    void (async () => {
      try {
        const r = await recordDailyParticipation(runId, day)
        setResult(r)
      } catch {
        // Échec d'agrégation : on n'abîme pas l'expérience (le verdict reste lu).
      }
    })()
  }, [phase, verdict.consensusScore, runId, day])

  const started = phase !== 'idle'
  const showStage2 = started && stage >= 2
  const showStage3 = started && (stage >= 3 || verdict.consensusScore !== null)
  const alreadyDone = hasParticipatedLocally(day)

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-1/4 left-1/2 h-[55vh] w-[80vw] max-w-[60rem] -translate-x-1/2 rounded-full bg-gold-dim blur-[140px]" />
      </div>

      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        <Link to="/" className="font-display text-2xl text-text transition-opacity hover:opacity-80">
          Quorum
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/jour/archive"
            className="hidden items-center gap-1.5 font-mono text-xs text-text-subtle underline-offset-4 hover:text-text-muted hover:underline sm:inline-flex"
          >
            <Archive aria-hidden="true" className="size-3.5" />
            archive
          </Link>
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 pb-12 lg:px-10">
        {load.kind === 'loading' && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-24 w-full max-w-md animate-pulse rounded-2xl bg-surface-raised/60" />
          </div>
        )}

        {load.kind === 'missing' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <CalendarDays aria-hidden="true" className="size-10 text-text-subtle" />
            <h1 className="font-display text-3xl text-text">Pas de question ce jour-là</h1>
            <p className="max-w-md text-text-muted">
              La Question du Jour n’a pas encore été publiée pour cette date.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/jour">Question d’aujourd’hui</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/jour/archive">Voir l’archive</Link>
              </Button>
            </div>
          </div>
        )}

        {load.kind === 'error' && (
          <div className="flex flex-1 items-center justify-center">
            <p role="alert" className="text-sm text-dissent">
              {load.message}
            </p>
          </div>
        )}

        {load.kind === 'ready' && (
          <AnimatePresence mode="wait" initial={false}>
            {!started ? (
              // ── Invitation : la question du jour, centrée ──
              <motion.section
                key="invite"
                className="flex flex-1 flex-col items-center justify-center gap-10 text-center lg:gap-16"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={ease}
              >
                <div className="flex max-w-3xl flex-col items-center gap-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-dim/40 px-3 py-1 font-mono text-xs tracking-wider text-gold uppercase">
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    Question du {formatDayFr(load.bundle.day)}
                  </span>
                  <h1 className="font-display text-4xl leading-tight text-text sm:text-5xl lg:text-7xl">
                    {load.bundle.question}
                  </h1>
                  <p className="max-w-md text-lg text-text-muted">
                    La même question pour tous, aujourd’hui. Convoquez votre assemblée et comparez
                    son verdict au consensus mondial.
                  </p>
                </div>

                {/* Pouls social avant de jouer (amorçage déterministe sous le seuil). */}
                {(() => {
                  const count = displayParticipations(load.bundle.participantCount, load.bundle.day)
                  const consensus = displayConsensus(
                    load.bundle.participantCount,
                    load.bundle.aggregateConsensus,
                    load.bundle.day,
                  )
                  return (
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Users aria-hidden="true" className="size-4 text-text-subtle" />
                        {count.toLocaleString('fr-FR')} participations
                      </span>
                      {consensus !== null && (
                        <span className="font-mono">{consensus}% de consensus mondial</span>
                      )}
                    </div>
                  )
                })()}

                <div className="flex flex-col items-center gap-2">
                  <Button
                    size="lg"
                    onClick={handleConvoke}
                    className="h-auto bg-gold px-8 py-3 text-lg text-[oklch(18%_0.03_70)] hover:bg-gold/90"
                  >
                    <Sparkles aria-hidden="true" />
                    Convoquer l’assemblée
                  </Button>
                  {alreadyDone && !past && (
                    <p className="text-xs text-text-subtle">
                      Vous avez déjà répondu aujourd’hui — vous pouvez recommencer.
                    </p>
                  )}
                  {past && (
                    <p className="text-xs text-text-subtle">Question d’archive · {formatDayFr(day)}</p>
                  )}
                </div>
              </motion.section>
            ) : (
              // ── Délibération en cours / terminée ──
              <motion.section
                key="run"
                className="flex flex-1 flex-col gap-6 pt-2"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={ease}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-3">
                    <span className="inline-flex w-fit items-center gap-2 font-mono text-xs tracking-wider text-gold uppercase">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      Question du {formatDayFr(load.bundle.day)}
                    </span>
                    <h1 className="max-w-3xl font-display text-2xl leading-snug text-text sm:text-3xl">
                      {load.bundle.question}
                    </h1>
                    <StageStepper stage={stage} phase={phase} />
                  </div>
                  <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
                    <RotateCcw aria-hidden="true" />
                    Recommencer
                  </Button>
                </div>

                {error && (
                  <FadeIn>
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dissent/40 bg-dissent-dim px-5 py-4"
                    >
                      <p className="text-sm text-text">{error}</p>
                      <Button variant="outline" size="sm" onClick={handleConvoke}>
                        Réessayer
                      </Button>
                    </div>
                  </FadeIn>
                )}

                <CouncilAssembly models={models} runKey={runKey} compact={compact} />

                {showStage2 && (
                  <FadeIn>
                    <Stage2Review models={models} reviews={reviews} borda={borda} />
                  </FadeIn>
                )}

                {showStage3 && <Stage3Verdict verdict={verdict} phase={phase} />}

                {/* Comparaison sociale + streak + partage Wordle */}
                {result && (
                  <DailyResultPanel
                    result={result}
                    slots={models.map((m) => m.slot)}
                    borda={borda}
                  />
                )}
              </motion.section>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
