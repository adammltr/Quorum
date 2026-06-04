import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { Profile } from '@/lib/db-helpers'
import { isMockMode } from '@/lib/council-client'
import { appUrl } from '@/lib/share'
import { track } from '@/lib/analytics'
import { REVERSE_TRIAL } from '@/config/billing'
import { maybeStartReverseTrial } from '@/lib/billing'
import { AuthContext, type AuthContextValue, type MagicLinkResult, type OtpResult } from './auth-context'

type Client = SupabaseClient<Database>

function isProProfile(p: Profile | null): boolean {
  if (!p?.is_pro) return false
  return p.pro_expires_at === null || new Date(p.pro_expires_at) > new Date()
}

/**
 * Source de vérité de la session. S'appuie sur l'Anonymous Auth : un visiteur a
 * toujours un auth.uid() (anonyme), et la conversion en compte (email/OAuth)
 * conserve ce même id — donc tous les runs/collections/councils déjà créés
 * restent rattachés, sans migration de données.
 */
export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const configured = !isMockMode()
  const [ready, setReady] = useState<boolean>(!configured)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const clientRef = useRef<Client | null>(null)
  // Garantit une seule tentative de reverse-trial par session (la RPC est de
  // toute façon idempotente côté serveur : jamais de second octroi).
  const trialAttempted = useRef<boolean>(false)

  const getClient = useCallback(async (): Promise<Client> => {
    if (clientRef.current) return clientRef.current
    const mod = await import('@/lib/supabase')
    await mod.ensureSession()
    clientRef.current = mod.supabase
    return mod.supabase
  }, [])

  const loadProfile = useCallback(async (client: Client, uid: string) => {
    const { data } = await client.from('profiles').select('*').eq('id', uid).maybeSingle()
    const p = (data as Profile | null) ?? null
    setProfile(p)

    // Reverse-trial (sous flag) : offert UNE fois à un compte inscrit non-PRO
    // qui n'a jamais eu de trial. L'octroi réel + l'idempotence sont serveur.
    if (
      REVERSE_TRIAL.enabled &&
      !trialAttempted.current &&
      p &&
      !p.is_anonymous &&
      !isProProfile(p) &&
      p.trial_started_at === null
    ) {
      trialAttempted.current = true
      const outcome = await maybeStartReverseTrial()
      if (outcome === 'started') {
        const { data: fresh } = await client.from('profiles').select('*').eq('id', uid).maybeSingle()
        setProfile((fresh as Profile | null) ?? p)
      }
    }
  }, [])

  // ── Bootstrap + abonnement aux changements de session ──
  useEffect(() => {
    if (!configured) return
    let unsub: (() => void) | undefined
    let cancelled = false

    void (async () => {
      const client = await getClient()
      const {
        data: { user: u },
      } = await client.auth.getUser()
      if (cancelled) return
      setUser(u)
      if (u) await loadProfile(client, u.id)
      setReady(true)

      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const next = session?.user ?? null
        setUser(next)
        if (next) void loadProfile(client, next.id)
        else setProfile(null)
      })
      unsub = () => data.subscription.unsubscribe()
    })()

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [configured, getClient, loadProfile])

  const refresh = useCallback(async () => {
    if (!configured || !user) return
    const client = await getClient()
    await loadProfile(client, user.id)
  }, [configured, user, getClient, loadProfile])

  const sendMagicLink = useCallback(
    async (email: string): Promise<MagicLinkResult> => {
      const trimmed = email.trim()
      if (!configured) {
        return { ok: false, mode: 'signin', message: 'Authentification indisponible en mode démo.' }
      }
      const client = await getClient()
      const emailRedirectTo = `${appUrl()}/`

      // Toujours un code OTP (signInWithOtp), JAMAIS updateUser : ce dernier
      // déclenche l'email « Confirm your new email address » (flow email_change)
      // au lieu d'un code à 6 chiffres. Pour une session anonyme active, Supabase
      // rattache l'identité au même auth.uid à la vérification — données préservées.
      const { error } = await client.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo, shouldCreateUser: true },
      })
      if (error) return { ok: false, mode: 'signin', message: error.message }
      track('signup_intent', { source: 'magic_link', method: 'signin' })
      return { ok: true, mode: 'signin' }
    },
    [configured, getClient],
  )

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<OtpResult> => {
      if (!configured) {
        return { ok: false, message: 'Authentification indisponible en mode démo.' }
      }
      const client = await getClient()
      const trimmedEmail = email.trim()
      const trimmedToken = token.trim()

      // Jeton de type `email` (signInWithOtp) : connexion, création de compte
      // ou rattachement d'une session anonyme — tous couverts par ce type.
      const { error } = await client.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedToken,
        type: 'email',
      })
      if (error) return { ok: false, message: error.message }

      // La session est établie : l'écouteur onAuthStateChange mettra à jour
      // user + profil. On force tout de même un rafraîchissement immédiat.
      const {
        data: { user: u },
      } = await client.auth.getUser()
      setUser(u)
      if (u) await loadProfile(client, u.id)
      track('signup_complete', { method: 'otp' })
      return { ok: true }
    },
    [configured, getClient, loadProfile],
  )

  const signInWithGoogle = useCallback(async () => {
    if (!configured) return
    const client = await getClient()
    // OAuth : on revient TOUJOURS sur l'origine exacte d'où part l'utilisateur
    // (preview Vercel, mobile, localhost…). Un appUrl() codé/figé provoquerait un
    // redirect vers une origine tierce → écran noir post-callback.
    const redirectTo = `${window.location.origin}/`
    track('signup_intent', { source: 'oauth_google' })

    // Anonyme → rattacher l'identité Google (préserve les données).
    if (user?.is_anonymous) {
      const { error } = await client.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo },
      })
      if (!error) return
      // Manual linking désactivé ou identité déjà liée : connexion classique.
    }
    await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }, [configured, user, getClient])

  const signOut = useCallback(async () => {
    if (!configured) return
    const client = await getClient()
    await client.auth.signOut()
    setProfile(null)
    // Réouvre immédiatement une session anonyme : l'app reste utilisable.
    const { ensureSession } = await import('@/lib/supabase')
    await ensureSession()
    const {
      data: { user: u },
    } = await client.auth.getUser()
    setUser(u)
    if (u) await loadProfile(client, u.id)
  }, [configured, getClient, loadProfile])

  const value = useMemo<AuthContextValue>(() => {
    const isAnonymous = user?.is_anonymous ?? true
    return {
      ready,
      configured,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      isAnonymous,
      isAuthenticated: !!user && !isAnonymous,
      isPro: isProProfile(profile),
      profile,
      sendMagicLink,
      verifyOtp,
      signInWithGoogle,
      signOut,
      refresh,
    }
  }, [ready, configured, user, profile, sendMagicLink, verifyOtp, signInWithGoogle, signOut, refresh])

  return <AuthContext value={value}>{children}</AuthContext>
}
