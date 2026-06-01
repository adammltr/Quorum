import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, THEME_STORAGE_KEY, type Theme } from './theme-context'

function applyThemeClass(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
}

function readInitialTheme(): Theme {
  // 1. Préférence persistée
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }
  // 2. Sinon : sombre par défaut (DESIGN.md). On ne suit pas l'OS au MVP
  //    pour garantir l'identité « encre chaude » dès le premier rendu.
  return 'dark'
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactNode {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    applyThemeClass(theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback((): void => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
