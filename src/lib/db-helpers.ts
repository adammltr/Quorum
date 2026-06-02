/**
 * Alias ergonomiques au-dessus des types Supabase générés.
 *
 * `database.types.ts` est généré (NE PAS éditer à la main) et type les colonnes
 * `jsonb` comme `Json`. Ici on :
 *   • ré-exporte les helpers génériques (Tables / TablesInsert / TablesUpdate)
 *   • nomme chaque ligne de table (Run, Verdict, …)
 *   • resserre les colonnes `jsonb` vers des formes métier précises
 */

import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/database.types'

export type { Tables, TablesInsert, TablesUpdate }

// ─── Énumérations métier (contraintes CHECK côté SQL) ──────────────────────
export type RunStatus =
  | 'pending'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'complete'
  | 'failed'
  | 'degraded'

export type RunMode = 'demo' | 'byok'
export type ResponseStatus = 'streaming' | 'complete' | 'error' | 'timeout'

// ─── Formes des colonnes jsonb ─────────────────────────────────────────────
/** Un délégué dans la composition d'un council (`councils.delegates`). */
export interface Delegate {
  slot: string
  model_id: string
  label: string
}

/** Une ligne de classement Stage 2, désanonymisée côté serveur (`reviews.ranking`). */
export interface RankingEntry {
  position: number
  anon_label: string
  target_slot: string
  reason: string
}

/** Composition figée d'un run (`runs.council_snapshot`). */
export interface CouncilSnapshot {
  delegates: Delegate[]
  chairman_model: string
}

// ─── Alias de lignes (jsonb resserré) ──────────────────────────────────────
export type Profile = Tables<'profiles'>
export type Question = Tables<'questions'>
export type ModelResponse = Tables<'model_responses'> & { status: ResponseStatus }
export type Collection = Tables<'collections'>
export type CollectionItem = Tables<'collection_items'>
export type Share = Tables<'shares'>
export type DailyQuestion = Tables<'daily_question'>
export type DailyUsage = Tables<'daily_usage'>

export type Council = Omit<Tables<'councils'>, 'delegates'> & {
  delegates: Delegate[]
}

export type Run = Omit<Tables<'runs'>, 'council_snapshot' | 'status' | 'mode'> & {
  council_snapshot: CouncilSnapshot
  status: RunStatus
  mode: RunMode
}

export type Review = Omit<Tables<'reviews'>, 'ranking'> & {
  ranking: RankingEntry[]
}

export type Verdict = Omit<Tables<'verdicts'>, 'disagreements' | 'borda_scores'> & {
  disagreements: string[]
  borda_scores: Record<string, number>
}
