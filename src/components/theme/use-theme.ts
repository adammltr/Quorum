import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './theme-context'

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useTheme doit être utilisé à l’intérieur de <ThemeProvider>.')
  }
  return ctx
}
