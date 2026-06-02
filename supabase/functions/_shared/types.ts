/**
 * Types métier partagés côté Edge Function (Deno).
 *
 * Volontairement dupliqués depuis `src/lib/db-helpers.ts` : le runtime Deno ne
 * résout pas l'alias `@/` du front. Garder les deux alignés avec les contraintes
 * CHECK SQL (migrations 0004 à 0006).
 */

/** Statut d'une réponse de délégué (`model_responses.status`). */
export type ResponseStatus = 'streaming' | 'complete' | 'error' | 'timeout'

/** Cycle de vie d'un run (`runs.status`). */
export type RunStatus =
  | 'pending'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'complete'
  | 'failed'
  | 'degraded'

/** Mode d'exécution (`runs.mode`). */
export type RunMode = 'demo' | 'byok'

/** Un délégué dans la composition d'un council (`councils.delegates`). */
export interface Delegate {
  slot: string
  model_id: string
  label: string
}

/** Composition figée d'un run (`runs.council_snapshot`). */
export interface CouncilSnapshot {
  delegates: Delegate[]
  chairman_model: string
}

/**
 * Une ligne de classement Stage 2, DÉSANONYMISÉE côté serveur (`reviews.ranking`).
 * `anon_label` = étiquette montrée au reviewer (« Réponse A ») ; `target_slot` =
 * slot réel ciblé (jamais montré au modèle).
 */
export interface RankingEntry {
  position: number
  anon_label: string
  target_slot: string
  reason: string
}
