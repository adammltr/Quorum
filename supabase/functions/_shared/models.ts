/**
 * Configuration CENTRALISÉE du moteur de consensus.
 *
 * ⚠️  Source unique de vérité pour : les providers gratuits du mode démo,
 * la composition par défaut du council, les timeouts, le retry et le rate limiting.
 * Pour changer les modèles, MODIFIER ICI (et garder le seed SQL 0013 + le preset
 * « Assemblée démo » en base alignés).
 *
 * Le mode démo route désormais vers PLUSIEURS providers gratuits OpenAI-compatibles
 * (Cerebras / Groq / Gemini) plutôt que les modèles `:free` d'OpenRouter (trop
 * limités). Le BYOK reste inchangé : il passe par OpenRouter avec la clé de l'utilisateur.
 */

/** Providers gratuits OpenAI-compatibles utilisés en mode démo. */
export type ProviderName = 'cerebras' | 'groq' | 'gemini'

export interface ProviderInfo {
  /** Base URL OpenAI-compatible (SANS le suffixe `/chat/completions`). */
  baseUrl: string
  /** Nom de la variable d'environnement contenant la clé serveur du provider. */
  keyEnv: string
}

/** Routage des providers du mode démo : base URL + variable d'env de la clé. */
export const PROVIDER_CONFIG: Record<ProviderName, ProviderInfo> = {
  cerebras: { baseUrl: 'https://api.cerebras.ai/v1', keyEnv: 'CEREBRAS_API_KEY' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', keyEnv: 'GEMINI_API_KEY' },
}

/** Un délégué de l'assemblée (Stage 1 & 2). Forme alignée sur `Delegate` (db-helpers.ts). */
export interface DelegateConfig {
  slot: string
  /** Provider gratuit ciblé en mode démo. */
  provider: ProviderName
  model_id: string
  label: string
}

/**
 * Composition par défaut du mode démo — providers gratuits multi-fournisseurs.
 * Fallback si aucun council n'est résolu en base. Doit refléter le seed 0013.
 */
export const DEFAULT_FREE_DELEGATES: readonly DelegateConfig[] = [
  { slot: 'A', provider: 'groq', model_id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
  { slot: 'B', provider: 'groq', model_id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { slot: 'C', provider: 'gemini', model_id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { slot: 'D', provider: 'groq', model_id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
] as const

/** Chairman par défaut (Stage 3) — Groq en mode démo. */
export const DEFAULT_CHAIRMAN = 'llama-3.3-70b-versatile'
export const DEFAULT_CHAIRMAN_PROVIDER: ProviderName = 'groq'

/**
 * Map `model_id → provider` pour le routage du mode démo (multi-provider).
 * Dérivée des délégués par défaut + du Chairman. Un modèle de démo absent de
 * cette table n'a pas de provider configuré (erreur explicite à l'appel).
 */
export const DEMO_PROVIDER_BY_MODEL: Readonly<Record<string, ProviderName>> = {
  ...Object.fromEntries(DEFAULT_FREE_DELEGATES.map((d) => [d.model_id, d.provider])),
  [DEFAULT_CHAIRMAN]: DEFAULT_CHAIRMAN_PROVIDER,
}

/**
 * Modèles premium débloqués UNIQUEMENT en BYOK (clé personnelle de l'utilisateur).
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

/** Base URL OpenRouter (OpenAI-compatible). Cible par défaut du BYOK. */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/** En-têtes d'attribution OpenRouter (bonnes pratiques, non secrets). */
export const OPENROUTER_REFERER = Deno.env.get('OPENROUTER_REFERER') ?? 'https://quorum-nine-ebon.vercel.app'
export const OPENROUTER_TITLE = 'Quorum'
