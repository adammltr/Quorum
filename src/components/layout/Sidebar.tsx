import { useState, type ReactNode } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Clock,
  FolderOpen,
  Lock,
  MoreHorizontal,
  PenLine,
  Pin,
  PinOff,
  Share2,
  Trash2,
  Users,
} from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { createShare, shareUrl, copyToClipboard } from '@/lib/share'
import { track } from '@/lib/analytics'
import type { HistoryItem } from '@/lib/account'
import { useSidebarRuns } from '@/hooks/useSidebarRuns'
import { useAuth } from '@/components/auth/use-auth'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useSidebar } from './use-sidebar'
import { SidebarToggle } from './SidebarToggle'
import { AccountPopover } from './AccountPopover'

const NAV_SECONDARY = [
  { to: '/history', labelKey: 'nav.history', icon: Clock },
  { to: '/collections', labelKey: 'nav.collections', icon: FolderOpen },
  { to: '/councils', labelKey: 'nav.councils', icon: Users },
] as const

const navItemClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    'flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm transition-colors',
    isActive
      ? 'bg-gold-dim text-gold'
      : 'text-text-muted hover:bg-surface-raised hover:text-text',
  )

/** Tronque proprement un titre pour la sidebar (sans couper en plein mot brutalement). */
function truncate(text: string, max: number): string {
  const t = text.trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

function ScoreBadge({ score }: { score: number }): ReactNode {
  return (
    <span className="shrink-0 rounded-full bg-gold-dim px-1.5 py-0.5 font-mono text-[0.64rem] tabular-nums text-gold">
      {score}
    </span>
  )
}

interface RunItemProps {
  item: HistoryItem
  onTogglePin: (item: HistoryItem) => void
  onRemove: (runId: string) => void
}

/** Ligne de run dans la sidebar : titre + méta + menu 3 points au hover. */
function RunItem({ item, onTogglePin, onRemove }: RunItemProps): ReactNode {
  const { t, i18n } = useTranslation()
  const score = item.verdict?.consensus_score ?? null

  const handleShare = async () => {
    try {
      const slug = await createShare(item.id)
      const ok = await copyToClipboard(shareUrl(slug))
      if (ok) track('share_copied', { kind: 'link' })
    } catch {
      /* échec silencieux : le partage reste accessible depuis la page du run */
    }
  }

  return (
    <div className="group/run relative flex items-center rounded-lg pr-1 transition-colors hover:bg-surface-raised">
      <Link
        to={`/run/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5"
        title={item.question}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-text-muted group-hover/run:text-text">
          {truncate(item.question, 30)}
        </span>
        {item.is_pinned && score !== null ? (
          <ScoreBadge score={score} />
        ) : (
          <span className="shrink-0 font-mono text-[0.64rem] text-text-subtle">
            {formatRelativeDate(item.created_at, i18n.language, true)}
          </span>
        )}
      </Link>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={t('sidebar.actions')}
            className="grid size-7 shrink-0 place-items-center rounded-md text-text-subtle opacity-0 transition-opacity hover:bg-surface hover:text-text group-hover/run:opacity-100 focus-visible:opacity-100 focus-visible:outline-none data-[state=open]:opacity-100"
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 flex w-44 flex-col gap-0.5 rounded-lg border border-border bg-surface-raised p-1 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text outline-none select-none data-[highlighted]:bg-surface"
              onSelect={() => onTogglePin(item)}
            >
              {item.is_pinned ? (
                <>
                  <PinOff aria-hidden="true" className="size-3.5 text-text-muted" />
                  {t('sidebar.unpin')}
                </>
              ) : (
                <>
                  <Pin aria-hidden="true" className="size-3.5 text-text-muted" />
                  {t('sidebar.pin')}
                </>
              )}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text outline-none select-none data-[highlighted]:bg-surface"
              onSelect={() => void handleShare()}
            >
              <Share2 aria-hidden="true" className="size-3.5 text-text-muted" />
              {t('sidebar.shareCopy')}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-dissent outline-none select-none data-[highlighted]:bg-surface"
              onSelect={() => onRemove(item.id)}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              {t('sidebar.delete')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }): ReactNode {
  return (
    <h2 className="px-4 pb-1 font-mono text-xs tracking-wider text-text-subtle uppercase">
      {children}
    </h2>
  )
}

/**
 * Sidebar collapsible (style Claude). Contenu du haut vers le bas : marque +
 * nouvelle question, navigation, runs épinglés, runs récents, et menu compte.
 */
export function Sidebar(): ReactNode {
  const { t } = useTranslation()
  const { open, isMobile, newQuestion } = useSidebar()
  const { isAuthenticated } = useAuth()
  const { pinned, recent, enabled, togglePin, remove } = useSidebarRuns()
  const [busy, setBusy] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const handleTogglePin = (item: HistoryItem) => {
    setBusy(item.id)
    void togglePin(item).finally(() => setBusy(null))
  }
  const handleRemove = (runId: string) => {
    void remove(runId)
  }

  const asideClass = cn(
    // overflow-hidden : en w-0 (fermée), clippe le contenu interne pour qu'il ne
    // déborde pas et n'intercepte pas les clics du hamburger du header.
    'fixed inset-y-0 left-0 z-40 flex h-dvh flex-col overflow-hidden border-r border-border bg-surface transition-[width,transform] duration-200 ease-out',
    isMobile
      ? cn('w-[288px] shadow-2xl', open ? 'translate-x-0' : '-translate-x-full')
      : cn('translate-x-0', open ? 'w-[288px]' : 'w-0'),
  )

  return (
    <aside className={asideClass} aria-label={t('nav.mainNav')} aria-hidden={!open}>
      {/* overflow-hidden interne : le contenu ne déborde pas quand la largeur est 0 */}
      <div
        className={cn(
          'flex h-full w-[288px] flex-col overflow-hidden transition-opacity duration-150',
          open ? 'opacity-100 delay-[50ms]' : 'opacity-0',
        )}
      >
        {/* ── Haut : marque + nouvelle question ── */}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="font-display text-xl text-text transition-opacity hover:opacity-80"
            >
              Quorum
            </Link>
            <SidebarToggle />
          </div>
          <button
            type="button"
            onClick={newQuestion}
            className="flex items-center gap-2.5 rounded-lg border border-border px-4 py-2.5 text-sm text-text transition-colors hover:border-gold/40 hover:bg-surface-raised"
          >
            <PenLine aria-hidden="true" className="size-4 text-gold" />
            {t('sidebar.newQuestion')}
          </button>
        </div>

        {/* ── Navigation (publique : Nouvelle question + Question du Jour) ── */}
        <nav className="flex flex-col gap-0.5 px-4">
          <NavLink to="/jour" className={navItemClass}>
            <Calendar aria-hidden="true" className="size-4" />
            {t('nav.questionOfDay')}
          </NavLink>
          {/* Historique / Collections / Councils : réservés au compte connecté */}
          {isAuthenticated && (
            <>
              <div className="my-1.5 h-px bg-border" />
              {NAV_SECONDARY.map(({ to, labelKey, icon: Icon }) => (
                <NavLink key={to} to={to} className={navItemClass}>
                  <Icon aria-hidden="true" className="size-4" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {isAuthenticated ? (
          /* ── Listes (épinglés + récents), zone scrollable ── */
          <div className="sidebar-scroll mt-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-3">
            {enabled && pinned.length > 0 && (
              <section className="flex flex-col gap-0.5">
                <SectionTitle>{t('sidebar.pinned')}</SectionTitle>
                {pinned.map((item) => (
                  <RunItem
                    key={item.id}
                    item={item}
                    onTogglePin={handleTogglePin}
                    onRemove={handleRemove}
                  />
                ))}
              </section>
            )}

            <section className="flex flex-col gap-0.5">
              <SectionTitle>{t('sidebar.recent')}</SectionTitle>
              {recent.length === 0 ? (
                <p className="px-4 py-2.5 text-sm text-text-subtle">
                  {t('sidebar.noDeliberations')}
                </p>
              ) : (
                recent.map((item) => (
                  <RunItem
                    key={item.id}
                    item={item}
                    onTogglePin={handleTogglePin}
                    onRemove={handleRemove}
                  />
                ))
              )}
            </section>
            {busy && <span className="sr-only" aria-live="polite">{t('common.updating')}</span>}
          </div>
        ) : (
          /* ── Anonyme : invitation à créer un compte ── */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <Lock aria-hidden="true" className="size-8 text-gold" />
            <p className="font-display text-lg text-text">
              {t('sidebar.historyWaiting')}
            </p>
            <p className="text-sm text-text-muted">
              {t('sidebar.createAccountCta')}
            </p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="mt-1 w-full rounded-lg bg-gold px-3 py-2 text-sm font-medium text-[oklch(18%_0.03_70)] transition-colors hover:bg-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('nav.signIn')}
            </button>
          </div>
        )}

        {/* ── Bas : compte ── */}
        <div className="border-t border-border p-2">
          <AccountPopover variant="full" side="top" />
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </aside>
  )
}
