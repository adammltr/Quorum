/**
 * Encodage Server-Sent Events (SSE) typé.
 *
 * Chaque événement a un `type` discriminant et un payload structuré, sérialisé
 * en une ligne `data: {json}\n\n`. Le client lit le flux et discrimine sur
 * `type` (4 flux Stage 1 entrelacés sont identifiés par `slot` + `model_id`).
 */

import type { ErrorCode } from './errors.ts'
import type { ResponseStatus } from './types.ts'

/** Union discriminée de tous les événements émis par l'endpoint council. */
export type CouncilEvent =
  /** Run créé : permet au client d'afficher l'id et la composition figée. */
  | { type: 'run'; run_id: string; mode: string; council_snapshot: unknown }
  /** Transition de stage (1 = réponses, 2 = peer-review, 3 = chairman). */
  | { type: 'stage'; stage: 1 | 2 | 3 }
  /** Token de réponse Stage 1, identifié par le délégué source. */
  | { type: 'token'; slot: string; model_id: string; delta: string }
  /** Changement de statut d'un délégué (dégradation gracieuse). */
  | { type: 'model_status'; slot: string; model_id: string; status: ResponseStatus; error?: string }
  /** Un reviewer a rendu son classement (Stage 2). */
  | { type: 'review'; reviewer_slot: string; parse_ok: boolean; ranking?: string[] }
  /** Scores Borda agrégés (Stage 2 terminé). */
  | { type: 'borda'; borda_scores: Record<string, number> }
  /** Token du verdict Chairman (Stage 3). */
  | { type: 'verdict_token'; delta: string }
  /** Verdict final structuré (Stage 3 terminé). */
  | {
      type: 'verdict'
      consensus_score: number
      disagreements: string[]
      borda_scores: Record<string, number>
    }
  /** Fin de la délibération. */
  | { type: 'done'; run_id: string; status: string }
  /** Erreur survenue pendant le flux (le run est clos proprement). */
  | { type: 'error'; code: ErrorCode; message: string }

/** En-têtes d'une réponse SSE. */
export function sseHeaders(extra: Record<string, string>): Record<string, string> {
  return {
    ...extra,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  }
}

/**
 * Émetteur SSE adossé à un `ReadableStreamDefaultController`. Sérialise et
 * encode chaque événement ; `close()` clôt le flux une seule fois.
 */
export class SseEmitter {
  private readonly encoder = new TextEncoder()
  private closed = false

  constructor(private readonly controller: ReadableStreamDefaultController<Uint8Array>) {}

  /** Pousse un événement typé. No-op si le flux est déjà clos. */
  send(event: CouncilEvent): void {
    if (this.closed) return
    const line = `data: ${JSON.stringify(event)}\n\n`
    this.controller.enqueue(this.encoder.encode(line))
  }

  /** Clôt le flux (idempotent). */
  close(): void {
    if (this.closed) return
    this.closed = true
    try {
      this.controller.close()
    } catch {
      // Flux déjà fermé côté client : on ignore.
    }
  }
}
