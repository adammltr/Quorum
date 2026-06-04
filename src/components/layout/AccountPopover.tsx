import { useState, type ReactNode } from 'react'
import { Popover } from 'radix-ui'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Code2, ExternalLink, FileText, LogOut, Settings, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/use-auth'
import { usePaywall } from '@/components/billing/use-paywall'
import { AuthDialog } from '@/components/auth/AuthDialog'

const GITHUB_URL = 'https://github.com/adammltr/Quorum'

const itemClass =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text outline-none transition-colors select-none hover:bg-surface-raised focus-visible:bg-surface-raised'

/** Initiale d'avatar à partir du nom ou de l'email. */
function initial(name: string | null, email: string | null): string {
  const src = name?.trim() || email?.trim() || '?'
  return src.charAt(0).toUpperCase()
}

interface AccountPopoverProps {
  /** `avatar` = pastille seule (navbar) ; `full` = ligne avatar + nom (sidebar). */
  variant: 'avatar' | 'full'
  /** Côté d'ouverture du menu (haut pour la sidebar, bas pour la navbar). */
  side?: 'top' | 'bottom'
}

/**
 * Menu de compte partagé — ouvert depuis l'avatar de la navbar ET depuis le bas
 * de la sidebar (même contenu). Anonyme → invite à se connecter.
 */
export function AccountPopover({ variant, side = 'top' }: AccountPopoverProps): ReactNode {
  const { t } = useTranslation()
  const { ready, isAuthenticated, isPro, email, profile, signOut } = useAuth()
  const { openPaywall } = usePaywall()
  const [authOpen, setAuthOpen] = useState(false)

  if (!ready) {
    return <span aria-hidden="true" className="skeleton-line size-8 rounded-full" />
  }

  if (!isAuthenticated) {
    // Sidebar (full) : bouton gold pleine largeur. Navbar (avatar) : outline compact.
    if (variant === 'full') {
      return (
        <>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="w-full rounded-lg bg-gold px-3 py-2 text-sm font-medium text-[oklch(18%_0.03_70)] transition-colors hover:bg-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('nav.signIn')}
          </button>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </>
      )
    }
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
          {t('nav.signIn')}
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  const name = profile?.display_name ?? email ?? t('nav.account')
  const avatar = (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-raised font-mono text-sm font-medium text-text ring-1 ring-border">
      {initial(profile?.display_name ?? null, email)}
    </span>
  )

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        {variant === 'avatar' ? (
          <button
            type="button"
            aria-label={t('nav.accountMenu')}
            className="rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {avatar}
          </button>
        ) : (
          <button
            type="button"
            aria-label={t('nav.accountMenu')}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {avatar}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm text-text">{name}</span>
              <span className="font-mono text-[0.64rem] tracking-wide uppercase">
                {isPro ? (
                  <span className="text-gold">{t('accountPopover.proShort')}</span>
                ) : (
                  <span className="text-text-subtle">{t('accountPopover.freeShort')}</span>
                )}
              </span>
            </span>
          </button>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          align={variant === 'full' ? 'center' : 'end'}
          sideOffset={8}
          className="z-50 flex w-60 flex-col gap-1 rounded-xl border border-border bg-surface-raised p-1.5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in"
        >
          <div className="flex flex-col gap-1 px-2.5 py-2">
            <span className="truncate text-sm font-medium text-text">{name}</span>
            <span>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-dim px-1.5 py-0.5 font-mono text-[0.64rem] tracking-wide text-gold uppercase">
                  <Sparkles aria-hidden="true" className="size-3" />
                  {t('accountPopover.proShort')}
                </span>
              ) : (
                <span className="font-mono text-xs text-text-subtle">{t('nav.freePlan')}</span>
              )}
            </span>
          </div>

          <div className="my-1 h-px bg-border" />

          <Popover.Close asChild>
            <Link to="/settings" className={itemClass}>
              <Settings aria-hidden="true" className="size-4 text-text-muted" />
              {t('accountPopover.settings')}
            </Link>
          </Popover.Close>

          {!isPro && (
            <Popover.Close asChild>
              <button
                type="button"
                className={`${itemClass} text-gold`}
                onClick={() => openPaywall('generic')}
              >
                <Sparkles aria-hidden="true" className="size-4 text-gold" />
                {t('nav.upgradePro')}
              </button>
            </Popover.Close>
          )}

          <div className="my-1 h-px bg-border" />

          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
          >
            <Shield aria-hidden="true" className="size-4 text-text-muted" />
            {t('footer.privacy')}
            <ExternalLink aria-hidden="true" className="ml-auto size-3 text-text-subtle" />
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={itemClass}>
            <FileText aria-hidden="true" className="size-4 text-text-muted" />
            {t('footer.terms')}
            <ExternalLink aria-hidden="true" className="ml-auto size-3 text-text-subtle" />
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Code2 aria-hidden="true" className="size-4 text-text-muted" />
            {t('accountPopover.github')}
            <ExternalLink aria-hidden="true" className="ml-auto size-3 text-text-subtle" />
          </a>

          <div className="my-1 h-px bg-border" />

          <Popover.Close asChild>
            <button type="button" className={itemClass} onClick={() => void signOut()}>
              <LogOut aria-hidden="true" className="size-4 text-text-muted" />
              {t('nav.signOut')}
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
