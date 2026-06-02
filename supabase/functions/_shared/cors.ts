/**
 * CORS — l'Edge Function est appelée depuis le navigateur (fetch streaming).
 *
 * En production, restreindre `Access-Control-Allow-Origin` au domaine de l'app
 * via la variable d'env `ALLOWED_ORIGIN` (défaut `*` en local).
 */

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Réponse au preflight OPTIONS. */
export function handlePreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}
