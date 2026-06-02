/**
 * Erreurs typées du moteur de consensus.
 *
 * Toute erreur exposée au client passe par un code stable (jamais un message
 * brut d'upstream) — facilite un affichage élégant et localisé côté front, et
 * évite toute fuite d'information sensible (clé, requête interne…).
 */

import { corsHeaders } from './cors.ts'

/** Codes d'erreur stables exposés au client. */
export type ErrorCode =
  | 'invalid_input'
  | 'unauthorized'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'council_not_found'
  | 'premium_requires_byok'
  | 'insufficient_models'
  | 'upstream_error'
  | 'internal'

/** Statut HTTP associé à chaque code (réponses non-stream). */
const HTTP_STATUS: Record<ErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  rate_limited: 429,
  quota_exceeded: 429,
  council_not_found: 404,
  premium_requires_byok: 403,
  insufficient_models: 502,
  upstream_error: 502,
  internal: 500,
}

/** Erreur métier typée (jette un code + message présentable). */
export class CouncilError extends Error {
  readonly code: ErrorCode
  readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'CouncilError'
    this.code = code
    this.details = details
  }
}

/** Construit une réponse JSON d'erreur typée (avant ouverture du flux SSE). */
export function errorResponse(err: unknown): Response {
  const { code, message, details } = normalize(err)
  return new Response(
    JSON.stringify({ error: { code, message, ...(details ? { details } : {}) } }),
    {
      status: HTTP_STATUS[code],
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
}

/** Normalise n'importe quelle valeur jetée en {code, message, details}. */
export function normalize(
  err: unknown,
): { code: ErrorCode; message: string; details?: Record<string, unknown> } {
  if (err instanceof CouncilError) {
    return { code: err.code, message: err.message, details: err.details }
  }
  // On NE propage JAMAIS un message d'erreur interne brut au client.
  return { code: 'internal', message: 'Une erreur interne est survenue.' }
}
