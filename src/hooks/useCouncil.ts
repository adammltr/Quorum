/**
 * useCouncil — état réactif d'une délibération Stage 1.
 *
 * Objectif : un streaming token-par-token *fluide à 60 fps* même quand le
 * réseau livre les octets en rafales. Les tokens entrants sont accumulés dans
 * un tampon (ref, hors React), puis « drainés » progressivement vers l'état
 * affiché au rythme de requestAnimationFrame — au plus un re-render par frame,
 * et un effet machine-à-écrire régulier (décharge proportionnelle au reste).
 *
 * Le statut final d'un modèle (complete/error/timeout) n'est appliqué qu'une
 * fois son tampon vidé : la carte ne « saute » jamais à l'état terminé en
 * laissant du texte non révélé.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  DEFAULT_DELEGATES,
  streamCouncil,
  type CouncilEvent,
  type ResponseStatus,
  type StreamHandle,
} from '@/lib/council-client'
import { track } from '@/lib/analytics'
import type { Delegate, RunMode } from '@/lib/db-helpers'

/** Options de convocation : council choisi (sinon assemblée démo par défaut). */
export interface SubmitOptions {
  councilId?: string
  mode?: RunMode
  /** Délégués du council choisi — pour le rendu optimiste avant le 1er octet. */
  delegates?: readonly Delegate[]
}

export type SlotPhase = 'pending' | 'streaming' | 'complete' | 'error' | 'timeout'
export type RunPhase = 'idle' | 'running' | 'done' | 'error'

export interface ModelState {
  slot: string
  modelId: string
  label: string
  content: string
  phase: SlotPhase
  error?: string
  /** Latence ressentie (ms), mesurée côté client, fixée à l'arrivée du statut. */
  latencyMs?: number
}

/** Un délégué ayant rendu son classement (Stage 2). */
export interface ReviewState {
  reviewerSlot: string
  parseOk: boolean
}

/** Synthèse du Chairman (Stage 3). */
export interface VerdictState {
  body: string
  consensusScore: number | null
  disagreements: string[]
}

const EMPTY_VERDICT: VerdictState = { body: '', consensusScore: null, disagreements: [] }

export interface CouncilState {
  phase: RunPhase
  stage: 1 | 2 | 3
  /** Identifiant du run en cours/terminé — requis pour le partage public. */
  runId: string | null
  models: ModelState[]
  /** Délégués ayant voté (Stage 2), dans l'ordre d'arrivée. */
  reviews: ReviewState[]
  /** Scores Borda agrégés par slot d'answer (Stage 2), null tant qu'absents. */
  borda: Record<string, number> | null
  /** Verdict du Chairman (Stage 3), body streamé. */
  verdict: VerdictState
  error: string | null
  submit: (question: string, opts?: SubmitOptions) => void
  reset: () => void
}

interface PendingStatus {
  phase: SlotPhase
  error?: string
  latencyMs?: number
}

function mapStatus(status: ResponseStatus): SlotPhase {
  return status === 'streaming' ? 'streaming' : status
}

function initialModels(delegates: readonly Delegate[]): ModelState[] {
  return delegates.map((d) => ({
    slot: d.slot,
    modelId: d.model_id,
    label: d.label,
    content: '',
    phase: 'pending',
  }))
}

export function useCouncil(): CouncilState {
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [stage, setStage] = useState<1 | 2 | 3>(1)
  const [runId, setRunId] = useState<string | null>(null)
  const [models, setModels] = useState<ModelState[]>([])
  const [reviews, setReviews] = useState<ReviewState[]>([])
  const [borda, setBorda] = useState<Record<string, number> | null>(null)
  const [verdict, setVerdict] = useState<VerdictState>(EMPTY_VERDICT)
  const [error, setError] = useState<string | null>(null)

  // ── Tampons hors-React (drainés par rAF) ──────────────────────────────────
  const buffers = useRef<Record<string, string>>({})
  const verdictBuffer = useRef<string>('')
  const pendingStatus = useRef<Record<string, PendingStatus>>({})
  const rafId = useRef<number | null>(null)
  const handle = useRef<StreamHandle | null>(null)
  const startedAt = useRef<number>(0)
  // Garantit que `time_to_first_verdict` n'est mesuré qu'une fois par run.
  const verdictTracked = useRef<boolean>(false)
  // Pointeur vers le drain courant : permet la ré-planification rAF récursive
  // sans que `tick` se référence lui-même (compatible react-hooks/immutability).
  const tickRef = useRef<() => void>(() => {})

  const schedule = useCallback(() => requestAnimationFrame(() => tickRef.current()), [])

  // Décharge progressive : ~1/5 du tampon par frame (min 3 caractères) → effet
  // typewriter lisse, rattrapage rapide si une grosse rafale arrive d'un coup.
  const tick = useCallback(() => {
    const buf = buffers.current
    const contentUpdates: Record<string, string> = {}
    let anyActive = false

    for (const slot of Object.keys(buf)) {
      const pending = buf[slot] ?? ''
      if (pending.length > 0) {
        const take = Math.max(3, Math.ceil(pending.length / 5))
        contentUpdates[slot] = pending.slice(0, take)
        buf[slot] = pending.slice(take)
        if (buf[slot]!.length > 0) anyActive = true
      }
    }

    // Applique les statuts dont le tampon est désormais vide.
    const statusUpdates: Record<string, PendingStatus> = {}
    for (const slot of Object.keys(pendingStatus.current)) {
      const st = pendingStatus.current[slot]
      const remaining = buf[slot]
      if (st && (!remaining || remaining.length === 0)) {
        statusUpdates[slot] = st
        delete pendingStatus.current[slot]
      }
    }

    const hasContent = Object.keys(contentUpdates).length > 0
    const hasStatus = Object.keys(statusUpdates).length > 0
    if (hasContent || hasStatus) {
      setModels((prev) =>
        prev.map((m) => {
          const add = contentUpdates[m.slot]
          const st = statusUpdates[m.slot]
          if (add === undefined && st === undefined) return m
          const next: ModelState = { ...m }
          if (add !== undefined) {
            next.content = m.content + add
            if (next.phase === 'pending') next.phase = 'streaming'
          }
          if (st !== undefined) {
            next.phase = st.phase
            next.error = st.error
            next.latencyMs = st.latencyMs
          }
          return next
        }),
      )
    }

    // Drain du verdict Chairman (même cadence typewriter, texte unique).
    const vbuf = verdictBuffer.current
    if (vbuf.length > 0) {
      const take = Math.max(3, Math.ceil(vbuf.length / 5))
      const chunk = vbuf.slice(0, take)
      verdictBuffer.current = vbuf.slice(take)
      if (verdictBuffer.current.length > 0) anyActive = true
      setVerdict((prev) => ({ ...prev, body: prev.body + chunk }))
    }

    const morePending = Object.keys(pendingStatus.current).length > 0
    rafId.current = anyActive || morePending ? schedule() : null
  }, [schedule])

  // Garde `tickRef` synchronisé avec le drain courant (avant toute frame).
  useLayoutEffect(() => {
    tickRef.current = tick
  }, [tick])

  const ensureRaf = useCallback(() => {
    if (rafId.current === null) rafId.current = schedule()
  }, [schedule])

  const handleEvent = useCallback(
    (e: CouncilEvent) => {
      switch (e.type) {
        case 'run': {
          setRunId(e.run_id)
          // Reconcilie avec la composition réelle du run (peut différer du défaut).
          const delegates = e.council_snapshot?.delegates
          if (Array.isArray(delegates) && delegates.length > 0) {
            setModels(initialModels(delegates))
          }
          break
        }
        case 'stage':
          setStage(e.stage)
          break
        case 'token':
          buffers.current[e.slot] = (buffers.current[e.slot] ?? '') + e.delta
          ensureRaf()
          break
        case 'model_status':
          pendingStatus.current[e.slot] = {
            phase: mapStatus(e.status),
            error: e.error,
            latencyMs: e.status !== 'streaming' ? Math.round(performance.now() - startedAt.current) : undefined,
          }
          ensureRaf()
          break
        case 'review':
          setReviews((prev) => [...prev, { reviewerSlot: e.reviewer_slot, parseOk: e.parse_ok }])
          break
        case 'borda':
          setBorda(e.borda_scores)
          break
        case 'verdict_token':
          verdictBuffer.current += e.delta
          ensureRaf()
          break
        case 'verdict':
          setBorda(e.borda_scores)
          setVerdict((prev) => ({
            ...prev,
            consensusScore: e.consensus_score,
            disagreements: e.disagreements,
          }))
          // Mesure clé du first-run : temps perçu jusqu'au premier verdict.
          if (!verdictTracked.current) {
            verdictTracked.current = true
            track('time_to_first_verdict', {
              duration_ms: Math.round(performance.now() - startedAt.current),
              consensus_score: e.consensus_score,
            })
          }
          break
        case 'done':
          setRunId(e.run_id)
          setPhase('done')
          break
        case 'error':
          setError(e.message)
          setPhase('error')
          break
        default:
          break
      }
    },
    [ensureRaf],
  )

  const cleanup = useCallback(() => {
    handle.current?.cancel()
    handle.current = null
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
    buffers.current = {}
    verdictBuffer.current = ''
    pendingStatus.current = {}
  }, [])

  const submit = useCallback(
    (question: string, opts?: SubmitOptions) => {
      const q = question.trim()
      if (!q) return
      cleanup()
      startedAt.current = performance.now()
      verdictTracked.current = false
      setError(null)
      setStage(1)
      setRunId(null)
      // Rendu optimiste : délégués du council choisi, sinon assemblée démo.
      setModels(initialModels(opts?.delegates ?? DEFAULT_DELEGATES))
      setReviews([])
      setBorda(null)
      setVerdict(EMPTY_VERDICT)
      setPhase('running')
      const mode = opts?.mode ?? 'demo'
      track('council_started', { question_length: q.length, has_council: !!opts?.councilId })
      handle.current = streamCouncil(
        { question: q, councilId: opts?.councilId, mode },
        handleEvent,
      )
    },
    [cleanup, handleEvent],
  )

  const reset = useCallback(() => {
    cleanup()
    setError(null)
    setStage(1)
    setRunId(null)
    setModels([])
    setReviews([])
    setBorda(null)
    setVerdict(EMPTY_VERDICT)
    setPhase('idle')
  }, [cleanup])

  useEffect(() => cleanup, [cleanup])

  return { phase, stage, runId, models, reviews, borda, verdict, error, submit, reset }
}
