import { useCallback, useEffect, useState } from 'react'
import {
  deleteRun,
  listHistory,
  listPinnedRuns,
  setRunPinned,
  type HistoryItem,
} from '@/lib/account'
import { useAuth } from '@/components/auth/use-auth'

export interface UseSidebarRuns {
  pinned: HistoryItem[]
  recent: HistoryItem[]
  loading: boolean
  /** true si l'historique est disponible (compte inscrit + backend configuré). */
  enabled: boolean
  togglePin: (item: HistoryItem) => Promise<void>
  remove: (runId: string) => Promise<void>
  reload: () => void
}

/**
 * Données de la sidebar : runs épinglés (max 5) + runs récents (max 10).
 *
 * Ne charge que pour un compte inscrit avec backend configuré (les anonymes
 * voient « Connecte-toi pour voir ton historique »). Les mutations (épingler,
 * supprimer) rafraîchissent les deux listes pour rester cohérentes.
 */
export function useSidebarRuns(): UseSidebarRuns {
  const { ready, configured, isAuthenticated } = useAuth()
  const enabled = ready && configured && isAuthenticated

  const [pinned, setPinned] = useState<HistoryItem[]>([])
  const [recent, setRecent] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // Non disponible (anonyme / mock) : on ne fetch pas ; les valeurs renvoyées
    // sont gatées par `enabled` plus bas (pas de setState dans l'effet).
    if (!enabled) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [p, r] = await Promise.all([listPinnedRuns(5), listHistory(10)])
        if (cancelled) return
        setPinned(p)
        setRecent(r)
      } catch {
        if (!cancelled) {
          setPinned([])
          setRecent([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [enabled, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const togglePin = useCallback(
    async (item: HistoryItem) => {
      await setRunPinned(item.id, !item.is_pinned)
      setReloadKey((k) => k + 1)
    },
    [],
  )

  const remove = useCallback(async (runId: string) => {
    await deleteRun(runId)
    setPinned((prev) => prev.filter((r) => r.id !== runId))
    setRecent((prev) => prev.filter((r) => r.id !== runId))
  }, [])

  return {
    pinned: enabled ? pinned : [],
    recent: enabled ? recent : [],
    loading,
    enabled,
    togglePin,
    remove,
    reload,
  }
}
