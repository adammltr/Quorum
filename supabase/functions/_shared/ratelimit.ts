/**
 * Rate limiting par IP — protège la clé OpenRouter `:free` contre les bursts
 * multi-sessions. S'appuie sur la RPC `consume_ip_rate_limit` (migration 0014),
 * appelée avec le client service_role.
 *
 * Confidentialité : l'IP n'est jamais transmise ni stockée en clair — on envoie
 * uniquement un hash SHA-256 salé (sel = `RATE_LIMIT_SALT`).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { encodeHex } from 'jsr:@std/encoding@1/hex'
import { RATE_LIMIT } from './models.ts'

const SALT = Deno.env.get('RATE_LIMIT_SALT') ?? 'quorum-default-salt'

/**
 * Extrait l'IP cliente depuis les en-têtes du proxy.
 *
 * On prend le DERNIER hop de `x-forwarded-for` : le proxy de confiance (Supabase)
 * ajoute l'IP réelle du client en FIN de chaîne, alors qu'un client malveillant
 * ne peut injecter des valeurs qu'en TÊTE. Prendre le premier hop serait donc
 * usurpable (rotation du hash → contournement du rate limit). On retombe sur
 * `x-real-ip` si `x-forwarded-for` est absent.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const hops = fwd.split(',').map((h) => h.trim()).filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/** Hash SHA-256 salé de l'IP (hex). */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return encodeHex(new Uint8Array(digest))
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string | null
}

/** Consomme un jeton de rate limit pour l'IP de la requête. */
export async function consumeIpRateLimit(
  service: SupabaseClient,
  req: Request,
): Promise<RateLimitResult> {
  const ipHash = await hashIp(clientIp(req))
  const { data, error } = await service.rpc('consume_ip_rate_limit', {
    p_ip_hash: ipHash,
    p_limit: RATE_LIMIT.maxRequests,
    p_window_seconds: RATE_LIMIT.windowSeconds,
  })

  // En cas d'échec RPC : on n'ouvre pas la porte en grand mais on ne bloque pas
  // tout le service non plus — fail-open contrôlé (le quota session reste actif).
  if (error || !data) {
    return { allowed: true, remaining: 0, resetAt: null }
  }

  const d = data as { allowed: boolean; remaining: number; reset_at: string }
  return { allowed: d.allowed, remaining: d.remaining, resetAt: d.reset_at }
}
