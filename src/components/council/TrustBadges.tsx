import { type ReactNode } from 'react'
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
    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {BADGES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
          <Icon aria-hidden="true" className="size-3.5 text-text-subtle" />
          {label}
        </li>
      ))}
    </ul>
  )
}
