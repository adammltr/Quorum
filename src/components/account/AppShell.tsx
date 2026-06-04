import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, FolderOpen, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useAuth } from '@/components/auth/use-auth'
import { AccountMenu } from './AccountMenu'
import { cn } from '@/lib/utils'

const NAV = [
  // `gated` : nécessite un compte. « Question du jour » reste accessible à tous.
  { to: '/jour', labelKey: 'nav.questionOfDay', icon: CalendarDays, gated: false },
  { to: '/history', labelKey: 'nav.history', icon: Clock, gated: true },
  { to: '/collections', labelKey: 'nav.collections', icon: FolderOpen, gated: true },
  { to: '/councils', labelKey: 'nav.councils', icon: Users, gated: true },
] as const

interface AppShellProps {
  title: string
  subtitle?: string
  /** Action principale optionnelle, alignée à droite du titre. */
  action?: ReactNode
  children: ReactNode
}

/** Coquille commune aux espaces « compte » (historique, collections, councils). */
export function AppShell({ title, subtitle, action, children }: AppShellProps): ReactNode {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  // Onglet verrouillé cliqué : affiche un popover inline éphémère (2 s).
  const [lockedHint, setLockedHint] = useState<string | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
  }, [])
  const showLockedHint = (to: string): void => {
    setLockedHint(to)
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setLockedHint(null), 2000)
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-1/4 left-1/2 h-[45vh] w-[70vw] max-w-[50rem] -translate-x-1/2 rounded-full bg-gold-dim blur-[140px] opacity-60" />
      </div>

      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        <Link
          to="/"
          className="font-display text-2xl text-text transition-opacity hover:opacity-80"
        >
          Quorum
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/">
              <Plus aria-hidden="true" />
              {t('nav.newQuestion')}
            </Link>
          </Button>
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-8 px-6 pb-16 lg:px-10">
        <div className="flex flex-col gap-6 pt-2">
          <nav
            className="-mx-4 flex items-center gap-1 overflow-x-auto scroll-smooth scrollbar-none px-4"
            aria-label={t('nav.accountSpaces')}
          >
            {NAV.map(({ to, labelKey, icon: Icon, gated }) => {
              const locked = gated && !isAuthenticated
              if (locked) {
                return (
                  <div key={to} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => showLockedHint(to)}
                      aria-disabled="true"
                      className="inline-flex cursor-not-allowed items-center gap-2 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap text-text-muted opacity-40 transition-colors"
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {t(labelKey)}
                    </button>
                    {lockedHint === to && (
                      <span
                        role="status"
                        className="absolute top-full left-1/2 z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1 text-xs text-text-subtle shadow-md"
                      >
                        {t('nav.lockedHint')}
                      </span>
                    )}
                  </div>
                )
              }
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-surface-raised text-text ring-1 ring-border'
                        : 'text-text-muted hover:text-text',
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {t(labelKey)}
                </NavLink>
              )
            })}
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-3xl leading-tight text-text sm:text-4xl">{title}</h1>
              {subtitle && <p className="max-w-xl text-sm text-text-muted">{subtitle}</p>}
            </div>
            {action}
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}
