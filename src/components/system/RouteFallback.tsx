import { type ReactNode } from 'react'

/**
 * Fallback affiché pendant le chargement d'une route en code-split.
 * Volontairement sans dépendance (ni Motion) : il doit s'afficher instantanément
 * même quand le chunk de la page tarde. L'animation des points respecte
 * prefers-reduced-motion (neutralisée via index.css).
 */
export function RouteFallback(): ReactNode {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Chargement…</span>
      <span className="inline-flex items-center gap-1.5" aria-hidden="true">
        <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
        <span className="thinking-dot" style={{ animationDelay: '160ms' }} />
        <span className="thinking-dot" style={{ animationDelay: '320ms' }} />
      </span>
    </div>
  )
}
