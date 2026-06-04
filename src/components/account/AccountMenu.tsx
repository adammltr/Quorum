import { useState, type ReactNode } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, FolderOpen, LogOut, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/use-auth'
import { usePaywall } from '@/components/billing/use-paywall'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { LanguageToggle } from '@/components/i18n/LanguageToggle'

const itemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'

/** Initiale d'avatar à partir du nom ou de l'email. */
function initial(name: string | null, email: string | null): string {
  const src = name?.trim() || email?.trim() || '?'
  return src.charAt(0).toUpperCase()
}

/**
 * Point d'entrée « compte » dans la barre supérieure. Anonyme → invite à se
 * connecter. Inscrit → menu vers l'historique, les collections, les councils.
 */
export function AccountMenu(): ReactNode {
  const { t } = useTranslation()
  const { ready, isAuthenticated, isPro, email, profile, signOut } = useAuth()
  const { openPaywall } = usePaywall()
  const [authOpen, setAuthOpen] = useState(false)

  if (!ready) {
    return <span aria-hidden="true" className="skeleton-line size-8 rounded-full" />
  }

  if (!isAuthenticated) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
          {t('nav.signIn')}
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-full bg-surface-raised font-mono text-sm font-medium text-text ring-1 ring-border transition-colors hover:ring-border-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('nav.accountMenu')}
        >
          {initial(profile?.display_name ?? null, email)}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 flex w-60 flex-col gap-1 rounded-xl border border-border bg-surface-raised p-1.5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in"
        >
          <div className="flex flex-col gap-1 px-2.5 py-2">
            <span className="truncate text-sm font-medium text-text">
              {profile?.display_name ?? email ?? t('nav.account')}
            </span>
            <span className="flex items-center gap-1.5">
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-dim px-1.5 py-0.5 font-mono text-[0.64rem] tracking-wide text-gold uppercase">
                  <Sparkles aria-hidden="true" className="size-3" />
                  {t('nav.pro')}
                </span>
              ) : (
                <span className="font-mono text-xs text-text-subtle">{t('nav.freePlan')}</span>
              )}
            </span>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <Link to="/history" className={itemClass}>
              <Clock aria-hidden="true" className="size-4 text-text-muted" />
              {t('nav.history')}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="/collections" className={itemClass}>
              <FolderOpen aria-hidden="true" className="size-4 text-text-muted" />
              {t('nav.collections')}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to="/councils" className={itemClass}>
              <Users aria-hidden="true" className="size-4 text-text-muted" />
              {t('nav.myCouncils')}
            </Link>
          </DropdownMenu.Item>

          {!isPro && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className={`${itemClass} text-gold data-[highlighted]:text-gold`}
                onSelect={() => openPaywall('generic')}
              >
                <Sparkles aria-hidden="true" className="size-4 text-gold" />
                {t('nav.upgradePro')}
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item className={itemClass} onSelect={() => void signOut()}>
            <LogOut aria-hidden="true" className="size-4 text-text-muted" />
            {t('nav.signOut')}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {/* Bascule de langue — discrète, au pied du menu compte */}
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="font-mono text-xs text-text-subtle">{t('lang.switch')}</span>
            <LanguageToggle />
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
