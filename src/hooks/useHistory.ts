import { useCallback, useEffect, useMemo, useState } from 'react'
import { listHistory, deleteRun, type HistoryItem } from '@/lib/account'
import { useAuth } from '@/components/auth/use-auth'

export interface UseHistory {
  items: HistoryItem[]
  loading: boolean
  error: string | null
  /** Sous-ensemble filtré par la requête de recherche (sous-chaîne, insensible). */
  results: HistoryItem[]
  query: string
  setQuery: (q: string) => void
  reload: () => void
  remove: (runId: string) => Promise<void>
}

/** Historique des runs de l'utilisateur, avec recherche locale et suppression. */
export function useHistory(): UseHistory {
  const { ready, configured } = useAuth()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const load = async () => {
      if (!configured) {
        setItems([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const rows = await listHistory()
        if (!cancelled) setItems(rows)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chargement impossible.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [ready, configured, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const remove = useCallback(async (runId: string) => {
    await deleteRun(runId)
    setItems((prev) => prev.filter((r) => r.id !== runId))
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((r) => r.question.toLowerCase().includes(q))
  }, [items, query])

  return { items, loading, error, results, query, setQuery, reload, remove }
}
