/**
 * Client Supabase typé, côté front.
 *
 * Sécurité : utilise EXCLUSIVEMENT la clé anon publique (VITE_SUPABASE_ANON_KEY).
 * Elle est publique par design — l'accès aux données est entièrement gouverné
 * par les politiques RLS (voir supabase/migrations/...rls_policies.sql).
 * La clé service_role ne doit JAMAIS apparaître ici ni atteindre le navigateur.
 *
 * Stratégie anonyme → compte : on s'appuie sur l'Anonymous Auth Supabase.
 * `ensureSession()` ouvre une session anonyme au premier chargement ; la
 * conversion en compte (email/OAuth) conserve le même `auth.uid()`, donc tous
 * les runs/collections/councils restent rattachés sans migration.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Quorum] VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis. ' +
      'Copie .env.example vers .env.local et renseigne les valeurs.',
  )
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

/**
 * Garantit qu'une session existe. Si aucune (premier passage), ouvre une
 * session anonyme — l'utilisateur peut poser sa 1re question sans inscription.
 * Retourne l'id utilisateur (anonyme ou inscrit).
 */
export async function ensureSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw new Error(`[Quorum] Échec de la session anonyme : ${error?.message}`)
  }
  return data.user.id
}

/** true si la session courante est anonyme (mode démo, non inscrit). */
export async function isAnonymous(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.is_anonymous ?? true
}
