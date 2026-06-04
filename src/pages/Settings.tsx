import { useEffect, type ReactNode } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { AppShell } from '@/components/account/AppShell'

/**
 * Paramètres — placeholder. Les réglages (thème, BYOK, notifications…) seront
 * câblés ultérieurement. La page existe déjà pour la navigation du menu compte.
 */
export function Settings(): ReactNode {
  useEffect(() => {
    document.title = 'Paramètres — Quorum'
    return () => {
      document.title = 'Quorum — Le consensus des intelligences'
    }
  }, [])

  return (
    <AppShell title="Paramètres" subtitle="Bientôt : thème, clés BYOK, rappels et préférences.">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
        <SettingsIcon aria-hidden="true" className="size-8 text-text-subtle" />
        <p className="max-w-md text-sm text-text-muted">
          Cette page accueillera bientôt vos préférences. Rien à configurer pour l’instant.
        </p>
      </div>
    </AppShell>
  )
}
