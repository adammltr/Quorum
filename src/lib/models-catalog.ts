/**
 * Catalogue de modèles — miroir CLIENT de `supabase/functions/_shared/models.ts`.
 *
 * Sert au compositeur de council : présenter les modèles sélectionnables, leur
 * label lisible et leur palier (FREE `:free` / PREMIUM BYOK). Garder aligné avec
 * la source serveur (qui reste l'autorité : un modèle premium sera refusé en
 * mode démo). On ne duplique ici que ce dont l'UI a besoin.
 */

export type ModelTier = 'free' | 'premium'

export interface CatalogModel {
  id: string
  label: string
  /** Éditeur, pour le regroupement visuel (ex. « OpenAI », « Meta »). */
  vendor: string
  tier: ModelTier
}

/** Modèles `:free` OpenRouter — disponibles dès le mode démo (sans compte PRO). */
export const FREE_MODELS: readonly CatalogModel[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', vendor: 'Meta', tier: 'free' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', vendor: 'Mistral', tier: 'free' },
  { id: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B', vendor: 'Google', tier: 'free' },
  { id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B', vendor: 'Qwen', tier: 'free' },
] as const

/** Modèles premium — débloqués en PRO (BYOK). Miroir de PREMIUM_ALLOWLIST. */
export const PREMIUM_MODELS: readonly CatalogModel[] = [
  { id: 'openai/gpt-4.1', label: 'GPT-4.1', vendor: 'OpenAI', tier: 'premium' },
  { id: 'openai/gpt-4o', label: 'GPT-4o', vendor: 'OpenAI', tier: 'premium' },
  { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5', vendor: 'Anthropic', tier: 'premium' },
  { id: 'anthropic/claude-opus-4-1', label: 'Claude Opus 4.1', vendor: 'Anthropic', tier: 'premium' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', vendor: 'Google', tier: 'premium' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', vendor: 'Google', tier: 'premium' },
  { id: 'x-ai/grok-3-mini', label: 'Grok 3 Mini', vendor: 'xAI', tier: 'premium' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', vendor: 'DeepSeek', tier: 'premium' },
] as const

export const ALL_MODELS: readonly CatalogModel[] = [...FREE_MODELS, ...PREMIUM_MODELS]

const MODEL_BY_ID = new Map(ALL_MODELS.map((m) => [m.id, m]))

/** true si le slug correspond à un modèle gratuit (`:free`). */
export function isFreeModel(modelId: string): boolean {
  return modelId.trim().toLowerCase().endsWith(':free')
}

/** Label lisible d'un modèle (fallback : slug après le « / »). */
export function modelLabel(modelId: string): string {
  const found = MODEL_BY_ID.get(modelId)
  if (found) return found.label
  const tail = modelId.split('/').pop() ?? modelId
  return tail.replace(/:free$/, '')
}

/** Modèles sélectionnables selon le statut (PRO débloque le premium). */
export function selectableModels(isPro: boolean): readonly CatalogModel[] {
  return isPro ? ALL_MODELS : FREE_MODELS
}

/** Slots ordonnés d'une assemblée à 4 délégués. */
export const COUNCIL_SLOTS = ['A', 'B', 'C', 'D'] as const
