import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, Search } from 'lucide-react'
import { AppShell } from '@/components/account/AppShell'
import { HistoryCard } from '@/components/account/HistoryCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useHistory } from '@/hooks/useHistory'
import { useAuth } from '@/components/auth/use-auth'

export function History(): ReactNode {
  const { t } = useTranslation()
  const { results, query, setQuery, loading, error, remove, items } = useHistory()
  const { isAuthenticated, isPro } = useAuth()

  return (
    <AppShell
      title={t('account.historyTitle')}
      subtitle={isPro ? t('account.historyDescPro') : t('account.historyDescFree')}
    >
      {/* Recherche */}
      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-subtle"
        />
        <Input
          type="search"
          placeholder={t('account.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label={t('account.searchAria')}
        />
      </div>

      {/* Bandeau de rétention pour les anonymes */}
      {!isAuthenticated && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/20 bg-gold-dim/40 px-5 py-4">
          <p className="text-sm text-text">{t('account.anonRetentionNote')}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-dissent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-line h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <Clock aria-hidden="true" className="size-8 text-text-subtle" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-xl text-text">
              {query ? t('account.historyNoResults') : t('account.historyEmptyTitle')}
            </p>
            <p className="text-sm text-text-muted">
              {query ? t('account.historyNoResultsHint') : t('account.historyEmptyHint')}
            </p>
          </div>
          {!query && (
            <Button asChild>
              <Link to="/">{t('account.askQuestion')}</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((item) => (
            <HistoryCard key={item.id} item={item} onRemove={remove} />
          ))}
        </div>
      )}
    </AppShell>
  )
}
