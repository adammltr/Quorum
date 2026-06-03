import { type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CalendarDays, Clock, FolderOpen, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { AccountMenu } from './AccountMenu'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/jour', label: 'Question du jour', icon: CalendarDays },
  { to: '/history', label: 'Historique', icon: Clock },
  { to: '/collections', label: 'Collections', icon: FolderOpen },
  { to: '/councils', label: 'Councils', icon: Users },
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
              Nouvelle question
            </Link>
          </Button>
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-8 px-6 pb-16 lg:px-10">
        <div className="flex flex-col gap-6 pt-2">
          <nav className="flex items-center gap-1" aria-label="Espaces du compte">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-surface-raised text-text ring-1 ring-border'
                      : 'text-text-muted hover:text-text',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </NavLink>
            ))}
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
