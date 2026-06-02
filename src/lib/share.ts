/**
 * Boucle de partage — moteur d'acquisition gratuit de Quorum.
 *
 * Tout ici est conçu pour être 100% gratuit et illimité, même en plan FREE et
 * en session anonyme (jamais derrière le paywall, SPEC §6). Le partage produit :
 *   • une URL publique propre  → /q/{slug}
 *   • un texte pré-rempli spoiler-friendly (façon Wordle : intrigant, pas de
 *     révélation du verdict) + une grille d'emoji d'accord/désaccord
 *   • des liens d'intention X / LinkedIn + Web Share API natif
 *
 * La création du partage passe par la RPC `create_share` (idempotente). En mode
 * démo (backend non configuré), on dégrade vers un slug factice pour rester
 * filmable sans casser l'UX.
 */

import { isMockMode } from '@/lib/council-client'
import { tierForRank, type Tier } from '@/components/council/slots'

/** Slug de démonstration utilisé quand le backend Supabase n'est pas configuré. */
export const DEMO_SLUG = 'demo'

/** Base publique de l'app (liens partagés). Fallback : origine courante. */
export function appUrl(): string {
  const configured = import.meta.env.VITE_APP_URL
  if (typeof configured === 'string' && configured.length > 0) {
    return configured.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

/** URL publique propre d'un partage. */
export function shareUrl(slug: string): string {
  return `${appUrl()}/q/${slug}`
}

/**
 * Crée (ou réutilise) le partage public d'un run et renvoie son slug.
 * Idempotent côté serveur. En mode démo, renvoie un slug factice.
 */
export async function createShare(runId: string): Promise<string> {
  if (isMockMode() || runId === 'mock-run') return DEMO_SLUG
  const { supabase, ensureSession } = await import('@/lib/supabase')
  await ensureSession()
  const { data, error } = await supabase.rpc('create_share', { p_run_id: runId })
  if (error || !data) {
    throw new Error(error?.message ?? 'Partage indisponible pour le moment.')
  }
  return data
}

// ─── Grille d'emoji (style Wordle) ──────────────────────────────────────────

const TIER_EMOJI: Record<Tier, string> = {
  consensus: '🟢',
  partial: '🟡',
  dissent: '🟠',
}

/**
 * Grille d'accord/désaccord par modèle, dans l'ordre des slots fournis.
 * Un modèle sans score (échec / pas de vote) est neutre (⚪).
 */
export function buildEmojiGrid(slots: string[], borda: Record<string, number> | null): string {
  if (!borda) return slots.map(() => '⚪').join('')
  const ranked = Object.entries(borda)
    .sort((a, b) => b[1] - a[1])
    .map(([slot]) => slot)
  const total = ranked.length
  return slots
    .map((slot) => {
      const rank = ranked.indexOf(slot)
      if (rank === -1) return '⚪'
      return TIER_EMOJI[tierForRank(rank, total)]
    })
    .join('')
}

// ─── Texte de partage ────────────────────────────────────────────────────────

/** Tronque proprement une question pour le texte de partage (sans couper un mot). */
function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export interface ShareTextInput {
  question: string
  consensusScore: number | null
  grid: string
  url: string
}

/**
 * Texte pré-rempli, spoiler-friendly : on intrigue (question + grille + score)
 * sans jamais révéler le verdict — il faut cliquer pour le lire.
 */
export function buildShareText({ question, consensusScore, grid, url }: ShareTextInput): string {
  const lines = [`J'ai soumis cette question à 4 IA : « ${truncate(question, 120)} »`]
  if (consensusScore !== null) {
    lines.push(`${grid}  ·  ${consensusScore}% de consensus`)
  } else {
    lines.push(grid)
  }
  lines.push('Leur verdict délibéré 👇')
  lines.push(url)
  return lines.join('\n')
}

// ─── Diffusion ────────────────────────────────────────────────────────────────

/** URL d'intention de post sur X (Twitter). */
export function xIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

/** URL d'intention de partage LinkedIn (n'accepte qu'une URL). */
export function linkedInIntentUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

/** true si l'API de partage natif est disponible (mobile surtout). */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Déclenche le partage natif. Renvoie false si indisponible ou annulé. */
export async function nativeShare(data: { title: string; text: string; url: string }): Promise<boolean> {
  if (!canNativeShare()) return false
  try {
    await navigator.share(data)
    return true
  } catch {
    // Annulation utilisateur ou erreur : on retombe sur les autres options.
    return false
  }
}

/** Copie un texte dans le presse-papiers. Renvoie true en cas de succès. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback ci-dessous */
  }
  return false
}
