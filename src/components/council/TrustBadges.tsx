import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Code2, KeyRound, Sparkles, UserX } from 'lucide-react'

/**
 * Réducteurs de risque perçu (SPEC §4) — rassurer avant le premier clic :
 * gratuit, sans inscription, clés privées, open source. Discret, en mono.
 */
const BADGES = [
  { icon: Sparkles, label: 'Gratuit' },
  { icon: UserX, label: 'Sans inscription' },
  { icon: KeyRound, label: 'Tes clés restent privées' },
  { icon: Code2, label: 'Open source' },
] as const

export function TrustBadges(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-4">
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {BADGES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
            <Icon aria-hidden="true" className="size-3.5 text-text-subtle" />
            {label}
          </li>
        ))}
      </ul>
      {/* Liens légaux — distincts des badges : sérif éditorial, pied de page */}
      <nav
        className="mt-4 flex items-center gap-4 font-display text-sm text-text-muted"
        aria-label="Liens légaux"
      >
        <Link to="/privacy" className="underline-offset-4 transition-colors hover:text-text hover:underline">
          Confidentialité
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="underline-offset-4 transition-colors hover:text-text hover:underline">
          CGU
        </Link>
      </nav>
    </div>
  )
}
