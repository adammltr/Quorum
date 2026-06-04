import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Code2, KeyRound, Sparkles, UserX } from 'lucide-react'
import { LanguageToggle } from '@/components/i18n/LanguageToggle'

/**
 * Réducteurs de risque perçu (SPEC §4) — rassurer avant le premier clic :
 * gratuit, sans inscription, clés privées, open source. Discret, en mono.
 */
const BADGES = [
  { icon: Sparkles, key: 'free' },
  { icon: UserX, key: 'noSignup' },
  { icon: KeyRound, key: 'keysPrivate' },
  { icon: Code2, key: 'openSource' },
] as const

export function TrustBadges(): ReactNode {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-4">
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {BADGES.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
            <Icon aria-hidden="true" className="size-3.5 text-text-subtle" />
            {t(`trust.${key}`)}
          </li>
        ))}
      </ul>
      {/* Liens légaux + bascule de langue — pied de page, sérif éditorial */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <nav
          className="flex items-center gap-4 font-display text-sm text-text-muted"
          aria-label={t('trust.legalNav')}
        >
          <Link to="/privacy" className="underline-offset-4 transition-colors hover:text-text hover:underline">
            {t('footer.privacy')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="underline-offset-4 transition-colors hover:text-text hover:underline">
            {t('footer.terms')}
          </Link>
        </nav>
        <span aria-hidden="true" className="text-text-subtle">·</span>
        <LanguageToggle />
      </div>
    </div>
  )
}
