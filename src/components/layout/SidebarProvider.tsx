import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SidebarContext, type SidebarContextValue } from './sidebar-context'

const STORAGE_KEY = 'sidebar_open'

/** Lit l'état persisté ; par défaut ouvert sur desktop, fermé sur mobile. */
function initialOpen(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    /* localStorage indisponible (mode privé) : on retombe sur le défaut */
  }
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
}

/**
 * Fournit l'état de la sidebar à toute l'app. Doit être monté à l'intérieur du
 * Router (utilise navigate/location) et des providers Auth/Paywall.
 */
export function SidebarProvider({ children }: { children: ReactNode }): ReactNode {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState<boolean>(initialOpen)

  // Persiste le choix de l'utilisateur.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(open))
    } catch {
      /* no-op */
    }
  }, [open])

  // Sur mobile, referme le tiroir à chaque navigation (UX attendue d'un drawer).
  // Différé en microtâche : pas de setState synchrone dans le corps de l'effet.
  useEffect(() => {
    if (!isMobile) return
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setOpen(false)
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname, isMobile])

  const toggle = useCallback(() => setOpen((v) => !v), [])
  const openSidebar = useCallback(() => setOpen(true), [])
  const closeSidebar = useCallback(() => setOpen(false), [])

  const newQuestion = useCallback(() => {
    if (isMobile) setOpen(false)
    // `fresh` (timestamp) force le reset de l'écran principal même si on y est déjà.
    navigate('/', { state: { fresh: Date.now() } })
  }, [isMobile, navigate])

  const value = useMemo<SidebarContextValue>(
    () => ({ open, isMobile, toggle, openSidebar, closeSidebar, newQuestion }),
    [open, isMobile, toggle, openSidebar, closeSidebar, newQuestion],
  )

  return <SidebarContext value={value}>{children}</SidebarContext>
}
