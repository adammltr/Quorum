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
      {/* Liens légaux — discrets, en pied de page */}
      <nav className="flex items-center gap-4 text-xs text-text-subtle" aria-label="Liens légaux">
        <Link to="/privacy" className="underline-offset-4 transition-colors hover:text-text-muted hover:underline">
          Confidentialité
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="underline-offset-4 transition-colors hover:text-text-muted hover:underline">
          CGU
        </Link>
      </nav>
    </div>
  )
}
