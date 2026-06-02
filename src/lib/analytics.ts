/**
 * Analytics minimal et tolérant aux pannes.
 *
 * - Si PostHog est présent (window.posthog, chargé via VITE_POSTHOG_KEY), on
 *   capture l'événement.
 * - Sinon, en dev, on journalise dans la console pour vérifier l'instrumentation.
 * - L'analytics ne doit JAMAIS casser l'app : tout est encapsulé.
 *
 * Aucune donnée personnelle : on ne transmet que des métriques agrégables
 * (durées, longueurs, scores), jamais le contenu des questions/réponses.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>

interface PostHogLike {
  capture: (event: string, properties?: AnalyticsProps) => void
}

function posthog(): PostHogLike | undefined {
  return (window as unknown as { posthog?: PostHogLike }).posthog
}

export function track(event: string, props?: AnalyticsProps): void {
  try {
    const ph = posthog()
    if (ph) {
      ph.capture(event, props)
      return
    }
    if (import.meta.env.DEV) {
      console.debug('[analytics]', event, props ?? {})
    }
  } catch {
    /* jamais d'erreur analytics propagée à l'UI */
  }
}
