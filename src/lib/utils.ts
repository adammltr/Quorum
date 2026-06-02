import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Date relative concise en français (« il y a 3 j », « à l'instant »). */
export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.round(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Jours restants avant expiration (historique gratuit), arrondi au supérieur. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / 86_400_000)
}
