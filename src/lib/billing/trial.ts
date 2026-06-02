/**
 * Reverse-trial — X jours de PRO offerts aux nouveaux comptes.
 *
 * Sous feature flag (`REVERSE_TRIAL.enabled`). L'octroi réel et son idempotence
 * (un seul trial par identité, jamais ré-accordé) sont garantis CÔTÉ SERVEUR
 * par la RPC `start_reverse_trial` (migration 0019, SECURITY DEFINER). Ici on ne
 * fait qu'appeler cette RPC une fois, sans risque : le serveur ignore tout appel
 * en doublon ou pour un compte déjà PRO.
 */

import { REVERSE_TRIAL } from '@/config/billing'
import { track } from '@/lib/analytics'

/** Issue de la tentative de démarrage du trial (miroir du retour RPC). */
export type TrialOutcome = 'started' | 'already_pro' | 'already_used' | 'disabled' | 'error'

interface TrialRpcResult {
  status: 'started' | 'already_pro' | 'already_used'
  expires_at?: string | null
}

/**
 * Démarre le reverse-trial si : le flag est actif, l'app est configurée, et le
 * compte n'en a jamais eu. Idempotent et silencieux en cas d'échec (jamais
 * bloquant pour l'utilisateur). Retourne l'issue pour instrumentation/UI.
 */
export async function maybeStartReverseTrial(): Promise<TrialOutcome> {
  if (!REVERSE_TRIAL.enabled) return 'disabled'
  try {
    const { supabase, ensureSession } = await import('@/lib/supabase')
    await ensureSession()
    const { data, error } = await supabase.rpc('start_reverse_trial')
    if (error) return 'error'
    const result = data as TrialRpcResult | null
    const status = result?.status ?? 'error'
    if (status === 'started') {
      track('reverse_trial_started', { days: REVERSE_TRIAL.days })
    }
    return status as TrialOutcome
  } catch {
    return 'error'
  }
}
