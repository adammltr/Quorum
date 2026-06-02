import { useCallback, useSyncExternalStore } from 'react'

/**
 * Observe une media query via useSyncExternalStore — la valeur est toujours
 * cohérente avec le DOM, sans setState dans un effet ni saut visuel au montage.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
