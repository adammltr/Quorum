/**
 * Configuration CENTRALISÉE du moteur de consensus.
 *
 * ⚠️  Source unique de vérité pour : la composition par défaut du council démo,
 * l'allowlist premium (BYOK), les timeouts, le retry et le rate limiting.
 * Pour changer les modèles, MODIFIER ICI (et garder le seed SQL 0013 aligné).
 *
 * ⚠️  Les slugs ":free" d'OpenRouter ÉVOLUENT régulièrement (modèles retirés /
 * ajoutés). Vérifier la liste à jour sur :
 *   https://openrouter.ai/collections/free-models
 * Les défauts ci-dessous sont alignés sur la migration de seed
 * `supabase/migrations/20260601090013_seed.sql` (council preset « Assemblée démo »).
 */

/** Un délégué de l'assemblée (Stage 1 & 2). Forme alignée sur `Delegate` (db-helpers.ts). */
export interface DelegateConfig {
  slot: string
  model_id: string
  label: string
}

/**
 * Composition par défaut du mode démo — UNIQUEMENT des modèles `:free`.
 * Fallback si aucun council n'est résolu en base. Doit refléter le seed 0013.
 */
export const DEFAULT_FREE_DELEGATES: readonly DelegateConfig[] = [
  { slot: 'A', model_id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
  { slot: 'B', model_id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B' },
  { slot: 'C', model_id: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B' },
  { slot: 'D', model_id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B' },
] as const

/** Chairman par défaut (Stage 3) — `:free` en mode démo. */
export const DEFAULT_CHAIRMAN = 'meta-llama/llama-3.3-70b-instruct:free'

/**
 * Modèles premium débloqués UNIQUEMENT en BYOK (clé personnelle de l'utilisateur).
 * Le mode démo (clé serveur) les refuse pour protéger la clé `:free`.
 * Liste indicative — étendre selon les besoins produit.
 */
export const PREMIUM_ALLOWLIST: readonly string[] = [
  'openai/gpt-4.1',
  'openai/gpt-4o',
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-opus-4-1',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-pro',
  'x-ai/grok-3-mini',
  'deepseek/deepseek-chat',
] as const

/** true si le slug correspond à un modèle gratuit OpenRouter (suffixe `:free`). */
export function isFreeModel(modelId: string): boolean {
  return modelId.trim().toLowerCase().endsWith(':free')
}

// ─── Paramètres d'orchestration ────────────────────────────────────────────

/** Timeout par délégué (Stage 1) et par appel LLM, en millisecondes. */
export const TIMEOUT_MS = Number(Deno.env.get('COUNCIL_TIMEOUT_MS') ?? 30_000)

/** Politique de retry (backoff exponentiel) sur erreurs transitoires (429/5xx). */
export const RETRY = {
  maxAttempts: 3,
  baseDelayMs: 1_000, // 1s → 2s → 4s
} as const

/**
 * Nombre minimal de délégués devant aboutir pour que la délibération ait du sens.
 * En dessous, le run est annulé (erreur explicite). Cf. SPEC §3.
 */
export const MIN_SUCCESSFUL_DELEGATES = 2

/** Plafonds d'entrée (validation / anti-abus). */
export const INPUT_LIMITS = {
  questionMin: 1,
  questionMax: 4_000,
  responseCharsForReview: 6_000, // tronque les réponses injectées en Stage 2/3
} as const

/**
 * Rate limiting par IP (fenêtre fixe), en complément du quota par session
 * (`increment_question_usage`). Protège la clé `:free` contre les bursts
 * multi-sessions derrière une même IP. Surchargeable via env.
 */
export const RATE_LIMIT = {
  windowSeconds: Number(Deno.env.get('RATE_LIMIT_WINDOW_SECONDS') ?? 60),
  maxRequests: Number(Deno.env.get('RATE_LIMIT_MAX_REQUESTS') ?? 8),
} as const

/** Barème Borda (Stage 2) : 1er = 3 pts, 2e = 2 pts, 3e = 1 pt (3 pairs notés). */
export const BORDA_POINTS: readonly number[] = [3, 2, 1] as const

/** Endpoint OpenRouter (chat completions). */
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** En-têtes d'attribution OpenRouter (bonnes pratiques, non secrets). */
export const OPENROUTER_REFERER = Deno.env.get('OPENROUTER_REFERER') ?? 'https://quorum.app'
export const OPENROUTER_TITLE = 'Quorum'
