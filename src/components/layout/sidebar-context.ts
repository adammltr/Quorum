import { createContext } from 'react'

/**
 * État global de la sidebar collapsible (style Claude).
 *
 * `open` est persisté dans localStorage. `isMobile` distingue le mode tiroir
 * (overlay + fermeture au clic dehors) du mode desktop (pousse le contenu).
 */
export interface SidebarContextValue {
  open: boolean
  isMobile: boolean
  toggle: () => void
  openSidebar: () => void
  closeSidebar: () => void
  /** Démarre une nouvelle question (→ /, reset de l'UI principale). */
  newQuestion: () => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)
