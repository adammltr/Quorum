import { createContext } from 'react'
import type { Profile } from '@/lib/db-helpers'

/** Issue d'un envoi de lien de connexion (distingue conversion et reconnexion). */
export interface MagicLinkResult {
  ok: boolean
  /** `convert` = rattachement à la session anonyme ; `signin` = compte existant. */
  mode: 'convert' | 'signin'
  message?: string
}

/** Issue de la vérification d'un code OTP. */
export interface OtpResult {
  ok: boolean
  message?: string
}

export interface AuthContextValue {
  /** true dès que la session initiale est résolue (évite les flashs). */
  ready: boolean
  /** false si Supabase n'est pas configuré (mode démo : auth désactivée). */
  configured: boolean
  userId: string | null
  email: string | null
  /** true tant que l'identité n'a pas d'email/identité liée (mode démo gratuit). */
  isAnonymous: boolean
  /** true = identité inscrite (email ou OAuth confirmé). */
  isAuthenticated: boolean
  isPro: boolean
  profile: Profile | null
  /** Envoie un code OTP à 6 chiffres (rattache la session anonyme si possible). */
  sendMagicLink: (email: string) => Promise<MagicLinkResult>
  /** Vérifie le code OTP à 6 chiffres reçu par email. */
  verifyOtp: (email: string, token: string) => Promise<OtpResult>
  /** Connexion/rattachement via Google (redirige). */
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Recharge le profil (après mutation : passage PRO, etc.). */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
