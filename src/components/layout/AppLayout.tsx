import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SidebarProvider } from './SidebarProvider'
import { Sidebar } from './Sidebar'
import { useSidebar } from './use-sidebar'

/**
 * Coquille globale de l'app : sidebar collapsible + contenu principal.
 *
 * Sur desktop, la sidebar pousse le contenu (margin animée). Sur mobile, elle
 * s'ouvre en tiroir au-dessus d'un voile sombre (fermeture au clic dehors).
 */
function LayoutInner({ children }: { children: ReactNode }): ReactNode {
  const { open, isMobile, closeSidebar } = useSidebar()
  return (
    <div className="relative min-h-dvh">
      <Sidebar />

      {/* Voile mobile — ferme la sidebar au clic dehors */}
      {isMobile && open && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in"
        />
      )}

      <div
        className={cn(
          'min-h-dvh transition-[margin] duration-200 ease-out',
          !isMobile && open ? 'ml-[260px]' : 'ml-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function AppLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  )
}
