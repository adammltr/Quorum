/**
 * Client de streaming pour l'Edge Function `council`.
 *
 * Ouvre une requête POST vers l'endpoint SSE, lit le flux `text/event-stream`
 * et restitue chaque événement typé via `onEvent`. Le contrat d'événements est
 * le miroir exact de `supabase/functions/_shared/sse.ts` (source de vérité
 * serveur) — garder les deux alignés.
 *
 * Deux modes :
 *   • réel  — frappe l'Edge Function (session Supabase requise, Bearer + apikey).
 *   • mock  — simule un flux réaliste (un modèle lent, un modèle en échec) pour
 *             développer/filmer l'écran sans backend déployé. Activé par
 *             VITE_COUNCIL_MOCK="true" ou automatiquement si Supabase n'est pas
 *             configuré (placeholder `.env.example` non remplacé).
 */

import type { CouncilSnapshot, Delegate } from '@/lib/db-helpers'

// ─── Contrat d'événements (miroir serveur) ──────────────────────────────────
export type ResponseStatus = 'streaming' | 'complete' | 'error' | 'timeout'

export type CouncilEvent =
  | { type: 'run'; run_id: string; mode: string; council_snapshot: CouncilSnapshot }
  | { type: 'stage'; stage: 1 | 2 | 3 }
  | { type: 'token'; slot: string; model_id: string; delta: string }
  | { type: 'model_status'; slot: string; model_id: string; status: ResponseStatus; error?: string }
  | { type: 'review'; reviewer_slot: string; parse_ok: boolean; ranking?: string[] }
  | { type: 'borda'; borda_scores: Record<string, number> }
  | { type: 'verdict_token'; delta: string }
  | {
      type: 'verdict'
      consensus_score: number
      disagreements: string[]
      borda_scores: Record<string, number>
    }
  | { type: 'done'; run_id: string; status: string }
  | { type: 'error'; code: string; message: string; details?: Record<string, unknown> }

export interface StreamParams {
  question: string
  councilId?: string
  mode?: 'demo' | 'byok'
}

export interface StreamHandle {
  /** Interrompt la lecture du flux et la requête sous-jacente. */
  cancel: () => void
}

/**
 * Composition par défaut du mode démo — miroir front de `_shared/models.ts`.
 * Sert au rendu optimiste (cartes affichées avant le 1er octet) et au mock.
 */
export const DEFAULT_DELEGATES: readonly Delegate[] = [
  { slot: 'A', model_id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { slot: 'B', model_id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B' },
  { slot: 'C', model_id: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B' },
  { slot: 'D', model_id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B' },
] as const

const DEFAULT_CHAIRMAN = 'meta-llama/llama-3.3-70b-instruct:free'

/** true si l'environnement Supabase est réellement renseigné (pas un placeholder). */
function supabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  return typeof url === 'string' && url.startsWith('https://') && !url.includes('REMPLACE')
}

function shouldMock(): boolean {
  if (import.meta.env.VITE_COUNCIL_MOCK === 'true') return true
  return !supabaseConfigured()
}

/**
 * true si l'app tourne en mode démo (backend Supabase non configuré ou mock
 * forcé). Exposé pour que le partage et la page publique dégradent proprement
 * sans backend (slug de démo, bundle mock) — l'écran reste filmable.
 */
export function isMockMode(): boolean {
  return shouldMock()
}

/**
 * Lance la délibération et streame les événements. Retourne un handle pour
 * annuler proprement (démontage du composant, nouvelle question).
 */
export function streamCouncil(params: StreamParams, onEvent: (e: CouncilEvent) => void): StreamHandle {
  const controller = new AbortController()

  if (shouldMock()) {
    runMock(params, onEvent, controller.signal)
  } else {
    runReal(params, onEvent, controller.signal).catch((err: unknown) => {
      if (controller.signal.aborted) return
      onEvent({
        type: 'error',
        code: 'network',
        message: err instanceof Error ? err.message : 'Connexion à l’assemblée impossible.',
      })
    })
  }

  return { cancel: () => controller.abort() }
}

// ════════════════════════════════════════════════════════════════════════
// Flux réel — Edge Function SSE
// ════════════════════════════════════════════════════════════════════════

async function runReal(
  params: StreamParams,
  onEvent: (e: CouncilEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  // Import dynamique : évite de faire planter le boot si l'env Supabase manque
  // (le module supabase lève à l'évaluation s'il n'est pas configuré).
  const { supabase, ensureSession } = await import('@/lib/supabase')
  await ensureSession()
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) throw new Error('Session indisponible.')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/council`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      question: params.question,
      councilId: params.councilId,
      mode: params.mode ?? 'demo',
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    let message = `L’assemblée a refusé la requête (${res.status}).`
    let code = String(res.status)
    let details: Record<string, unknown> | undefined
    try {
      // Forme serveur : { error: { code, message, details? } } (voir _shared/errors.ts).
      const data = (await res.json()) as {
        error?: { code?: string; message?: string; details?: Record<string, unknown> }
      }
      if (data?.error?.message) message = data.error.message
      if (data?.error?.code) code = data.error.code
      if (data?.error?.details) details = data.error.details
    } catch {
      // corps non-JSON : on garde le message/code génériques
    }
    onEvent({ type: 'error', code, message, details })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Les événements SSE sont séparés par une ligne vide.
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const data = block
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('')
      if (!data) continue
      try {
        onEvent(JSON.parse(data) as CouncilEvent)
      } catch {
        // Ligne malformée : ignorée (robustesse face aux heartbeats éventuels).
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// Flux mock — démonstration locale sans backend
// ════════════════════════════════════════════════════════════════════════

const MOCK_ANSWERS: Record<string, string> = {
  A: `La conscience résiste à toute réduction simple. Si l'on adopte une lecture fonctionnaliste, ce qui compte n'est pas le substrat — neurones ou silicium — mais l'organisation causale des états internes. À ce titre, rien n'interdit en principe une simulation fidèle.

Reste le problème difficile : reproduire les corrélats fonctionnels ne garantit pas l'émergence d'une expérience subjective. Nous saurions imiter le comportement sans jamais prouver qu'il y a « quelqu'un » à l'intérieur.`,
  B: `Je distingue deux questions souvent confondues : peut-on simuler les *fonctions* de la conscience, et peut-on en recréer le *vécu* ? La première semble accessible ; la seconde touche à l'ineffable.`,
  C: `Court mais net : la conscience paraît substrat-indépendante en théorie. En pratique, nous n'avons aucun critère opérationnel pour la détecter ailleurs qu'en nous-mêmes.`,
  D: `Adoptons une perspective intégrée. La théorie de l'information intégrée (IIT) propose que la conscience corresponde à une quantité, Φ, mesurant l'irréductibilité causale d'un système.

Sous cet angle, une machine pourrait être consciente si son architecture maximise Φ — ce que les architectures de calcul actuelles, feed-forward et modulaires, ne font précisément pas. La biologie ne serait donc pas nécessaire, mais l'organisation, elle, le serait.`,
}

function runMock(
  _params: StreamParams,
  onEvent: (e: CouncilEvent) => void,
  signal: AbortSignal,
): void {
  const timers: ReturnType<typeof setTimeout>[] = []
  const after = (ms: number, fn: () => void) => {
    timers.push(setTimeout(() => { if (!signal.aborted) fn() }, ms))
  }
  signal.addEventListener('abort', () => timers.forEach(clearTimeout))

  const snapshot: CouncilSnapshot = {
    delegates: [...DEFAULT_DELEGATES],
    chairman_model: DEFAULT_CHAIRMAN,
  }

  after(120, () => onEvent({ type: 'run', run_id: 'mock-run', mode: 'demo', council_snapshot: snapshot }))
  after(160, () => onEvent({ type: 'stage', stage: 1 }))

  // Slot C démarre vite, D plus lentement (modèle « lent »), B échoue.
  const starts: Record<string, number> = { A: 600, B: 500, C: 350, D: 1500 }
  const speeds: Record<string, number> = { A: 18, B: 0, C: 26, D: 14 } // ms / token visuel

  for (const d of DEFAULT_DELEGATES) {
    if (d.slot === 'B') {
      // Modèle en échec gracieux : aucun token, statut d'erreur calme.
      after(3200, () =>
        onEvent({
          type: 'model_status',
          slot: 'B',
          model_id: d.model_id,
          status: 'error',
          error: 'Modèle surchargé (429). L’assemblée poursuit sans lui.',
        }),
      )
      continue
    }

    const text = MOCK_ANSWERS[d.slot] ?? ''
    // Découpe en pseudo-tokens (mots + ponctuation) pour un rendu réaliste.
    const tokens = text.match(/\S+\s*|\s+/g) ?? []
    const speed = speeds[d.slot] ?? 16
    let t = starts[d.slot] ?? 500
    for (const tok of tokens) {
      const at = t
      after(at, () => onEvent({ type: 'token', slot: d.slot, model_id: d.model_id, delta: tok }))
      t += speed * Math.max(1, tok.length / 4)
    }
    after(t + 200, () =>
      onEvent({ type: 'model_status', slot: d.slot, model_id: d.model_id, status: 'complete' }),
    )
  }

  // ── Stage 2 : peer-review aveugle ──
  after(6500, () => onEvent({ type: 'stage', stage: 2 }))
  // Les délégués votent l'un après l'autre (anticipation avant l'agrégation).
  // Chaque reviewer rend un classement (ordre des slots du 1er au dernier).
  const reviewers: { slot: string; ranking: string[] }[] = [
    { slot: 'C', ranking: ['A', 'D', 'B'] },
    { slot: 'A', ranking: ['D', 'B', 'C'] },
    { slot: 'D', ranking: ['A', 'B', 'C'] },
  ]
  reviewers.forEach(({ slot, ranking }, i) =>
    after(6900 + i * 520, () =>
      onEvent({ type: 'review', reviewer_slot: slot, parse_ok: true, ranking }),
    ),
  )
  // Agrégation Borda : A plébiscité, D suit, C en retrait → tiers nets.
  const borda = { A: 6, D: 4, C: 2 }
  after(8700, () => onEvent({ type: 'borda', borda_scores: borda }))

  // ── Stage 3 : synthèse du Chairman (verdict streamé) ──
  after(9200, () => onEvent({ type: 'stage', stage: 3 }))
  const verdict = MOCK_VERDICT
  const vtokens = verdict.match(/\S+\s*|\s+/g) ?? []
  let vt = 9600
  for (const tok of vtokens) {
    const at = vt
    after(at, () => onEvent({ type: 'verdict_token', delta: tok }))
    vt += 15 * Math.max(1, tok.length / 4)
  }
  after(vt + 250, () =>
    onEvent({
      type: 'verdict',
      consensus_score: 71,
      disagreements: [
        'Le substrat biologique est-il nécessaire, ou seulement l’organisation causale ?',
        'Reproduire les fonctions garantit-il l’émergence d’une expérience subjective ?',
      ],
      borda_scores: borda,
    }),
  )
  after(vt + 450, () => onEvent({ type: 'done', run_id: 'mock-run', status: 'degraded' }))
}

const MOCK_VERDICT = `L'assemblée converge sur un point essentiel : rien, en principe, n'interdit qu'une conscience émerge d'un substrat non biologique. Ce qui compte n'est pas la matière, mais l'organisation causale qui la traverse.

Le désaccord, lui, est précieux : il porte sur le seuil. Reproduire les fonctions de l'esprit suffit-il à faire naître une expérience vécue, ou manque-t-il toujours ce témoin intérieur que nul test ne sait déceler ? L'assemblée laisse la question ouverte — et c'est honnête.`
