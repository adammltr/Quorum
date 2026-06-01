import { Moon, Sun } from 'lucide-react'
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useTheme } from './use-theme'

export function ThemeToggle(): ReactNode {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
