/**
 * Edge Function `council` — MOTEUR DE CONSENSUS de Quorum.
 *
 * Orchestre la délibération en 3 stages et streame le résultat au client via SSE :
 *   Stage 1  réponses parallèles (fan-out streaming, tolérant aux pannes)
 *   Stage 2  peer-review aveugle (anonymisé) → agrégation Borda
 *   Stage 3  synthèse Chairman → score de consensus + désaccords assumés
 *
 * Sécurité : clé serveur `:free` jamais exposée ; BYOK déchiffrée à la volée et
 * jamais journalisée ; entrées validées ; rate limiting IP + quota session ;
 * persistance via service_role (respecte le mode anonyme via auth.uid()).
 *
 * Voir le plan : docs/context/council-engine.md
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { corsHeaders, handlePreflight } from '../_shared/cors.ts'
import { CouncilError, errorResponse, normalize } from '../_shared/errors.ts'
import { SseEmitter, sseHeaders } from '../_shared/sse.ts'
import { consumeIpRateLimit } from '../_shared/ratelimit.ts'
import { decryptByokKey } from '../_shared/crypto.ts'
import {
  buildStage1,
  buildStage2,
  buildStage3Chairman,
  parseChairmanOutput,
} from '../_shared/prompts.ts'
import {
  aggregateBorda,
  type BordaBallot,
  computeConsensus,
  parseFinalRanking,
} from '../_shared/ranking.ts'
import { streamChatCompletion } from '../_shared/openrouter.ts'
import {
  DEFAULT_CHAIRMAN,
  DEFAULT_FREE_DELEGATES,
  INPUT_LIMITS,
  isFreeModel,
  MIN_SUCCESSFUL_DELEGATES,
} from '../_shared/models.ts'
import type {
  CouncilSnapshot,
  Delegate,
  RankingEntry,
  ResponseStatus,
  RunStatus,
} from '../_shared/types.ts'

// ─── Requête entrante ──────────────────────────────────────────────────────
interface CouncilRequest {
  question: string
  councilId?: string
  mode?: 'demo' | 'byok'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Caractères de contrôle à retirer de la question (on conserve \t \n \r).
// Construit en échappements ASCII (aucun octet de contrôle littéral dans la source).
// deno-lint-ignore no-control-regex
const CONTROL_CHARS_RE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]',
  'g',
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handlePreflight()
  if (req.method !== 'POST') {
    return errorResponse(new CouncilError('invalid_input', 'Méthode non autorisée (POST requis).'))
  }
  try {
    return await handleCouncil(req)
  } catch (err) {
    return errorResponse(err)
  }
})

async function handleCouncil(req: Request): Promise<Response> {
  // ── 1. Validation / sanitization de l'entrée ──────────────────────────────
  const body = await parseBody(req)
  const question = sanitizeQuestion(body.question)

  // ── 2. Clients Supabase (service_role + contexte utilisateur) ─────────────
  const supabaseUrl = mustEnv('SUPABASE_URL')
  const service = createClient(supabaseUrl, mustEnv('SUPABASE_SERVICE_ROLE_KEY'))

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    throw new CouncilError('unauthorized', 'Session requise.')
  }
  const userClient = createClient(supabaseUrl, mustEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) throw new CouncilError('unauthorized', 'Session invalide.')

  // ── 3. Rate limiting par IP (protège la clé free) ─────────────────────────
  const rl = await consumeIpRateLimit(service, req)
  if (!rl.allowed) {
    throw new CouncilError('rate_limited', 'Trop de requêtes. Réessaie dans un instant.', {
      reset_at: rl.resetAt,
    })
  }

  // ── 4. Quota freemium par session (5 anon / 10 compte / ∞ PRO) ────────────
  const { data: usage, error: usageErr } = await userClient.rpc('increment_question_usage')
  if (usageErr) throw new CouncilError('unauthorized', 'Quota indisponible pour cette session.')
  if (usage && (usage as { allowed: boolean }).allowed === false) {
    throw new CouncilError('quota_exceeded', 'Quota quotidien atteint. Reviens demain ou passe en BYOK.')
  }

  // ── 5. Résolution du council (RLS) ────────────────────────────────────────
  const { snapshot, councilId } = await resolveCouncil(userClient, service, body.councilId)

  // ── 6. Résolution de la clé + autorisation des modèles ────────────────────
  const { apiKey, mode, premiumAllowed } = await resolveApiKey(service, user.id, body.mode)
  if (!premiumAllowed) {
    const premium = [...snapshot.delegates.map((d) => d.model_id), snapshot.chairman_model]
      .filter((m) => !isFreeModel(m))
    if (premium.length > 0) {
      throw new CouncilError(
        'premium_requires_byok',
        'Ces modèles requièrent ta propre clé OpenRouter (BYOK).',
        { models: premium },
      )
    }
  }

  // ── 7. Persistance initiale : question + run ──────────────────────────────
  const questionId = await insertQuestion(service, question, user.id)
  const runId = await insertRun(service, {
    userId: user.id,
    questionId,
    councilId,
    snapshot,
    mode,
  })

  // ── 8. Flux SSE : l'orchestration se déroule pendant que le client lit ────
  const ac = new AbortController()
  req.signal.addEventListener('abort', () => ac.abort())

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = new SseEmitter(controller)
      try {
        await runDeliberation({ emit, service, apiKey, snapshot, runId, question, mode, signal: ac.signal })
      } catch (err) {
        const { code, message } = normalize(err)
        emit.send({ type: 'error', code, message })
        await markRun(service, runId, 'failed', message)
      } finally {
        emit.close()
      }
    },
    cancel() {
      ac.abort()
    },
  })

  return new Response(stream, { headers: sseHeaders(corsHeaders) })
}

// ════════════════════════════════════════════════════════════════════════
// Orchestration des 3 stages
// ════════════════════════════════════════════════════════════════════════

interface DeliberationCtx {
  emit: SseEmitter
  service: SupabaseClient
  apiKey: string
  snapshot: CouncilSnapshot
  runId: string
  question: string
  mode: string
  signal: AbortSignal
}

/** Résultat consolidé d'un délégué après Stage 1. */
interface DelegateOutcome {
  delegate: Delegate
  content: string
  status: ResponseStatus
}

async function runDeliberation(ctx: DeliberationCtx): Promise<void> {
  const { emit, snapshot, runId } = ctx
  emit.send({ type: 'run', run_id: runId, mode: ctx.mode, council_snapshot: snapshot })

  // ── Stage 1 — réponses parallèles ─────────────────────────────────────────
  emit.send({ type: 'stage', stage: 1 })
  const outcomes = await runStage1(ctx)
  const successful = outcomes.filter((o) => o.status === 'complete' && o.content.trim().length > 0)

  if (successful.length < MIN_SUCCESSFUL_DELEGATES) {
    throw new CouncilError(
      'insufficient_models',
      `Trop peu de modèles ont répondu (${successful.length}/${snapshot.delegates.length}).`,
    )
  }

  // ── Stage 2 — peer-review aveugle ─────────────────────────────────────────
  await markRun(ctx.service, runId, 'stage2')
  emit.send({ type: 'stage', stage: 2 })
  const ballots = await runStage2(ctx, successful)
  const successfulSlots = successful.map((o) => o.delegate.slot)
  const bordaScores = aggregateBorda(ballots, successfulSlots)
  emit.send({ type: 'borda', borda_scores: bordaScores })

  // ── Stage 3 — synthèse Chairman ───────────────────────────────────────────
  await markRun(ctx.service, runId, 'stage3')
  emit.send({ type: 'stage', stage: 3 })
  const consensus = await runStage3(ctx, successful, bordaScores)

  // ── Clôture ───────────────────────────────────────────────────────────────
  const finalStatus: RunStatus =
    successful.length === snapshot.delegates.length ? 'complete' : 'degraded'
  await markRun(ctx.service, runId, finalStatus, null, true)
  emit.send({
    type: 'verdict',
    consensus_score: consensus.score,
    disagreements: consensus.disagreements,
    borda_scores: bordaScores,
  })
  emit.send({ type: 'done', run_id: runId, status: finalStatus })
}

/** Stage 1 : fan-out parallèle streaming, tolérant aux pannes. */
async function runStage1(ctx: DeliberationCtx): Promise<DelegateOutcome[]> {
  const { emit, snapshot, apiKey, question, signal, service, runId } = ctx

  const tasks = snapshot.delegates.map(async (delegate): Promise<DelegateOutcome> => {
    const startedAt = Date.now()
    try {
      const { content, tokensIn, tokensOut } = await streamChatCompletion(
        { apiKey, model: delegate.model_id, messages: buildStage1(question), signal },
        (delta) => emit.send({ type: 'token', slot: delegate.slot, model_id: delegate.model_id, delta }),
      )
      const status: ResponseStatus = 'complete'
      emit.send({ type: 'model_status', slot: delegate.slot, model_id: delegate.model_id, status })
      await persistResponse(service, runId, delegate, {
        content, status, latencyMs: Date.now() - startedAt, tokensIn, tokensOut,
      })
      return { delegate, content, status }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur modèle'
      const status: ResponseStatus = /délai/i.test(message) ? 'timeout' : 'error'
      emit.send({ type: 'model_status', slot: delegate.slot, model_id: delegate.model_id, status, error: message })
      await persistResponse(service, runId, delegate, {
        content: '', status, latencyMs: Date.now() - startedAt, error: message,
      })
      return { delegate, content: '', status }
    }
  })

  const settled = await Promise.allSettled(tasks)
  return settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : { delegate: ctx.snapshot.delegates[i], content: '', status: 'error' as ResponseStatus }
  )
}

/** Stage 2 : chaque reviewer classe les AUTRES réponses, anonymisées + mélangées. */
async function runStage2(
  ctx: DeliberationCtx,
  successful: DelegateOutcome[],
): Promise<BordaBallot[]> {
  const { emit, apiKey, question, signal, service, runId } = ctx
  const ballots: BordaBallot[] = []

  const tasks = successful.map(async (reviewer) => {
    // Les autres réponses, mélangées et étiquetées (mapping label→slot privé).
    const others = shuffle(successful.filter((o) => o.delegate.slot !== reviewer.delegate.slot))
    const labels = others.map((_, i) => String.fromCharCode(65 + i)) // A, B, C…
    const labelToSlot = new Map<string, string>()
    const presented = others.map((o, i) => {
      labelToSlot.set(labels[i], o.delegate.slot)
      return { anonLabel: labels[i], content: o.content }
    })

    let raw = ''
    let parseOk = false
    let ranking: RankingEntry[] = []
    try {
      const res = await streamChatCompletion({
        apiKey, model: reviewer.delegate.model_id, messages: buildStage2(question, presented), signal,
      })
      raw = res.content
      const parsed = parseFinalRanking(raw, labels)
      parseOk = parsed.ok
      if (parsed.ok) {
        ranking = parsed.order.map((label, idx) => ({
          position: idx + 1,
          anon_label: `Réponse ${label}`,
          target_slot: labelToSlot.get(label)!,
          reason: '',
        }))
        ballots.push({ ranked: parsed.order.map((label) => labelToSlot.get(label)!) })
      }
    } catch (err) {
      // Reviewer KO : vote ignoré (parse_ok=false), le flow continue.
      raw = err instanceof Error ? `[erreur: ${err.message}]` : ''
    }

    await persistReview(service, runId, reviewer.delegate, ranking, raw, parseOk)
    emit.send({ type: 'review', reviewer_slot: reviewer.delegate.slot, parse_ok: parseOk })
  })

  await Promise.allSettled(tasks)
  return ballots
}

/** Stage 3 : le Chairman synthétise, score le consensus et expose les désaccords. */
async function runStage3(
  ctx: DeliberationCtx,
  successful: DelegateOutcome[],
  bordaScores: Record<string, number>,
): Promise<{ score: number; disagreements: string[] }> {
  const { emit, apiKey, question, signal, service, runId, snapshot } = ctx

  const answers = successful.map((o) => ({
    slot: o.delegate.slot, label: o.delegate.label, content: o.content,
  }))

  let raw = ''
  try {
    const res = await streamChatCompletion(
      { apiKey, model: snapshot.chairman_model, messages: buildStage3Chairman(question, answers, bordaScores), signal },
      (delta) => emit.send({ type: 'verdict_token', delta }),
    )
    raw = res.content
  } catch (err) {
    throw new CouncilError(
      'upstream_error',
      'Le Chairman n\'a pas pu rendre son verdict.',
      { cause: err instanceof Error ? err.message : undefined },
    )
  }

  const parsed = parseChairmanOutput(raw)
  // Score Chairman si valide, sinon fallback objectif depuis l'accord des votes.
  const score = parsed.consensusScore ?? computeConsensus(bordaScores)

  await persistVerdict(service, runId, snapshot.chairman_model, {
    body: parsed.body, consensusScore: score, disagreements: parsed.disagreements, bordaScores, raw,
  })

  return { score, disagreements: parsed.disagreements }
}

// ════════════════════════════════════════════════════════════════════════
// Validation & résolutions
// ════════════════════════════════════════════════════════════════════════

async function parseBody(req: Request): Promise<CouncilRequest> {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    throw new CouncilError('invalid_input', 'Content-Type application/json requis.')
  }
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new CouncilError('invalid_input', 'Corps JSON invalide.')
  }
  const obj = raw as Record<string, unknown>
  if (typeof obj?.question !== 'string') {
    throw new CouncilError('invalid_input', 'Le champ « question » est requis.')
  }
  if (obj.councilId !== undefined && (typeof obj.councilId !== 'string' || !UUID_RE.test(obj.councilId))) {
    throw new CouncilError('invalid_input', '« councilId » doit être un UUID valide.')
  }
  if (obj.mode !== undefined && obj.mode !== 'demo' && obj.mode !== 'byok') {
    throw new CouncilError('invalid_input', '« mode » doit valoir « demo » ou « byok ».')
  }
  return {
    question: obj.question,
    councilId: obj.councilId as string | undefined,
    mode: obj.mode as 'demo' | 'byok' | undefined,
  }
}

/** Nettoie la question : trim, retrait des caractères de contrôle, bornes de longueur. */
function sanitizeQuestion(input: string): string {
  const cleaned = input.replace(CONTROL_CHARS_RE, '').trim()
  if (cleaned.length < INPUT_LIMITS.questionMin) {
    throw new CouncilError('invalid_input', 'La question est vide.')
  }
  if (cleaned.length > INPUT_LIMITS.questionMax) {
    throw new CouncilError('invalid_input', `La question dépasse ${INPUT_LIMITS.questionMax} caractères.`)
  }
  return cleaned
}

/** Résout le council : explicite (RLS user) ou preset démo par défaut. */
async function resolveCouncil(
  userClient: SupabaseClient,
  service: SupabaseClient,
  councilId?: string,
): Promise<{ snapshot: CouncilSnapshot; councilId: string | null }> {
  if (councilId) {
    const { data, error } = await userClient
      .from('councils')
      .select('id, delegates, chairman_model')
      .eq('id', councilId)
      .maybeSingle()
    if (error || !data) throw new CouncilError('council_not_found', 'Council introuvable ou inaccessible.')
    return {
      snapshot: { delegates: data.delegates as Delegate[], chairman_model: data.chairman_model },
      councilId: data.id,
    }
  }

  // Council démo par défaut (preset système). Fallback : constantes de config.
  const { data } = await service
    .from('councils')
    .select('id, delegates, chairman_model')
    .eq('is_preset', true)
    .eq('is_default', true)
    .maybeSingle()
  if (data) {
    return {
      snapshot: { delegates: data.delegates as Delegate[], chairman_model: data.chairman_model },
      councilId: data.id,
    }
  }
  return {
    snapshot: { delegates: [...DEFAULT_FREE_DELEGATES], chairman_model: DEFAULT_CHAIRMAN },
    councilId: null,
  }
}

/** Résout la clé OpenRouter : serveur (`:free`) ou BYOK déchiffrée (premium). */
async function resolveApiKey(
  service: SupabaseClient,
  userId: string,
  requestedMode?: 'demo' | 'byok',
): Promise<{ apiKey: string; mode: 'demo' | 'byok'; premiumAllowed: boolean }> {
  if (requestedMode === 'byok') {
    const { data } = await service
      .from('user_secrets')
      .select('openrouter_key_encrypted, has_byok')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.has_byok && data.openrouter_key_encrypted) {
      try {
        const apiKey = await decryptByokKey(data.openrouter_key_encrypted)
        return { apiKey, mode: 'byok', premiumAllowed: true }
      } catch {
        // Déchiffrement impossible : on retombe proprement en mode démo.
      }
    }
  }
  return { apiKey: mustEnv('OPENROUTER_API_KEY'), mode: 'demo', premiumAllowed: false }
}

// ════════════════════════════════════════════════════════════════════════
// Persistance (service_role)
// ════════════════════════════════════════════════════════════════════════

async function insertQuestion(service: SupabaseClient, body: string, authorId: string): Promise<string> {
  const { data, error } = await service
    .from('questions')
    .insert({ body, author_id: authorId })
    .select('id')
    .single()
  if (error || !data) throw new CouncilError('internal', 'Échec d\'enregistrement de la question.')
  return data.id
}

async function insertRun(
  service: SupabaseClient,
  p: { userId: string; questionId: string; councilId: string | null; snapshot: CouncilSnapshot; mode: string },
): Promise<string> {
  const { data, error } = await service
    .from('runs')
    .insert({
      user_id: p.userId,
      question_id: p.questionId,
      council_id: p.councilId,
      council_snapshot: p.snapshot,
      mode: p.mode,
      status: 'stage1',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error || !data) throw new CouncilError('internal', 'Échec de création du run.')
  return data.id
}

async function persistResponse(
  service: SupabaseClient,
  runId: string,
  delegate: Delegate,
  p: {
    content: string
    status: ResponseStatus
    latencyMs: number
    tokensIn?: number | null
    tokensOut?: number | null
    error?: string
  },
): Promise<void> {
  const { error } = await service.from('model_responses').insert({
    run_id: runId,
    slot: delegate.slot,
    model_id: delegate.model_id,
    content: p.content || null,
    status: p.status,
    error: p.error ?? null,
    latency_ms: p.latencyMs,
    tokens_in: p.tokensIn ?? null,
    tokens_out: p.tokensOut ?? null,
  })
  if (error) console.error('[council] persist model_response:', error.message)
}

async function persistReview(
  service: SupabaseClient,
  runId: string,
  reviewer: Delegate,
  ranking: RankingEntry[],
  raw: string,
  parseOk: boolean,
): Promise<void> {
  const { error } = await service.from('reviews').insert({
    run_id: runId,
    reviewer_slot: reviewer.slot,
    reviewer_model: reviewer.model_id,
    ranking,
    raw_output: raw || null,
    parse_ok: parseOk,
  })
  if (error) console.error('[council] persist review:', error.message)
}

async function persistVerdict(
  service: SupabaseClient,
  runId: string,
  chairmanModel: string,
  p: {
    body: string
    consensusScore: number
    disagreements: string[]
    bordaScores: Record<string, number>
    raw: string
  },
): Promise<void> {
  const { error } = await service.from('verdicts').insert({
    run_id: runId,
    chairman_model: chairmanModel,
    body: p.body,
    consensus_score: p.consensusScore,
    disagreements: p.disagreements,
    borda_scores: p.bordaScores,
    raw_output: p.raw || null,
  })
  if (error) console.error('[council] persist verdict:', error.message)
}

/** Met à jour le statut du run (et completed_at si terminal). */
async function markRun(
  service: SupabaseClient,
  runId: string,
  status: RunStatus,
  errorMsg: string | null = null,
  completed = false,
): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (errorMsg) patch.error = errorMsg
  if (completed) patch.completed_at = new Date().toISOString()
  const { error } = await service.from('runs').update(patch).eq('id', runId)
  if (error) console.error('[council] markRun:', error.message)
}

// ════════════════════════════════════════════════════════════════════════
// Utilitaires
// ════════════════════════════════════════════════════════════════════════

function mustEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new CouncilError('internal', `Variable d'environnement manquante : ${name}`)
  return v
}

/** Mélange Fisher-Yates (anonymisation Stage 2). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
