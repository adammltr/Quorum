import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Date relative concise, localisée selon `lang` (« il y a 3 j » ↔ « 3 d ago »).
 * `compact` retire le préfixe/suffixe (« 3 j » / « 3 d ») pour les badges étroits.
 */
export function formatRelativeDate(iso: string, lang = 'en', compact = false): string {
  const isFr = lang.startsWith('fr')
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.round(diff / 60_000)
  if (min < 1) {
    if (compact) return isFr ? 'maintenant' : 'now'
    return isFr ? "à l'instant" : 'just now'
  }
  if (min < 60) return compact ? `${min} min` : isFr ? `il y a ${min} min` : `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return compact ? `${h} h` : isFr ? `il y a ${h} h` : `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 30) return compact ? (isFr ? `${d} j` : `${d} d`) : isFr ? `il y a ${d} j` : `${d} d ago`
  return new Date(iso).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Jours restants avant expiration (historique gratuit), arrondi au supérieur. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / 86_400_000)
}
