import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Bascule de langue discrète : [ EN · FR ]. Actif en `text-text`, inactif en
 * `text-text-subtle`. Le clic change la langue i18next et persiste le choix
 * (localStorage, géré par le detector). Utilisé dans le footer (TrustBadges)
 * et le menu compte (AccountMenu).
 */
export function LanguageToggle({ className }: { className?: string }): ReactNode {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en').slice(0, 2)

  return (
    <div className={cn('flex items-center gap-1.5 font-mono text-xs', className)}>
      {SUPPORTED_LANGUAGES.map((lng: Language, i) => (
        <span key={lng} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className="text-text-subtle">·</span>}
          <button
            type="button"
            onClick={() => setLanguage(lng)}
            aria-pressed={current === lng}
            className={cn(
              'uppercase underline-offset-4 transition-colors hover:text-text',
              current === lng ? 'text-text' : 'text-text-subtle',
            )}
          >
            {lng}
          </button>
        </span>
      ))}
    </div>
  )
}
