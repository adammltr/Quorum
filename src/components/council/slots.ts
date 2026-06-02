/**
 * Vocabulaire visuel partagé de l'assemblée.
 *
 * - SLOT_ACCENT : teinte d'identité subtile par délégué (chroma bas — l'ambre
 *   signature reste réservé au verdict, DESIGN.md §3).
 * - consensusTier : sémantique du vote (vert calme → ambre → rouille), mappée
 *   sur un rang relatif. Le rang le plus bas n'est PAS une « erreur » : c'est le
 *   point de divergence, présenté comme une information précieuse.
 */

/** Teinte OKLCH d'identité par slot. */
export const SLOT_ACCENT: Record<string, string> = {
  A: 'oklch(72% 0.09 155)', // vert calme
  B: 'oklch(70% 0.09 235)', // bleu acier
  C: 'oklch(75% 0.09 60)', //  sable
  D: 'oklch(70% 0.10 310)', // prune
}

export function slotAccent(slot: string): string {
  return SLOT_ACCENT[slot] ?? 'var(--text-muted)'
}

export type Tier = 'consensus' | 'partial' | 'dissent'

/** Variables CSS de la sémantique de vote (cohérentes avec tokens.css). */
export const TIER_COLOR: Record<Tier, string> = {
  consensus: 'var(--consensus)',
  partial: 'var(--partial)',
  dissent: 'var(--dissent)',
}

export const TIER_DIM: Record<Tier, string> = {
  consensus: 'var(--consensus-dim)',
  partial: 'var(--partial-dim)',
  dissent: 'var(--dissent-dim)',
}

export const TIER_LABEL: Record<Tier, string> = {
  consensus: 'Accord fort',
  partial: 'Accord partiel',
  dissent: 'Point de divergence',
}

/**
 * Associe un rang (0 = meilleur) à un palier sémantique, selon le nombre total
 * de réponses classées. Le sommet = consensus, le bas = divergence, le reste
 * = accord partiel.
 */
export function tierForRank(rank: number, total: number): Tier {
  if (total <= 1) return 'consensus'
  if (rank === 0) return 'consensus'
  if (rank === total - 1) return 'dissent'
  return 'partial'
}
