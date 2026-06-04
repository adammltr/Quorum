import { type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './use-sidebar'

/**
 * Bouton hamburger d'ouverture/fermeture de la sidebar.
 *
 * Placé en haut à gauche des barres de navigation. Sur mobile sans tiroir
 * ouvert, il reste le seul moyen d'ouvrir la sidebar.
 *
 * `hideWhenOpen` : à activer dans les en-têtes de page — la sidebar possède son
 * propre toggle, on n'affiche donc jamais deux hamburgers en même temps.
 */
export function SidebarToggle({
  className,
  hideWhenOpen = false,
}: {
  className?: string
  hideWhenOpen?: boolean
}): ReactNode {
  const { open, toggle } = useSidebar()
  if (hideWhenOpen && open) return null
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
      aria-expanded={open}
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Menu aria-hidden="true" className="size-5" />
    </button>
  )
}
