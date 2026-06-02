import { useCallback, useEffect, useState } from 'react'
import {
  createCollection,
  deleteCollection,
  listCollections,
  FREE_LIMITS,
  type CollectionSummary,
} from '@/lib/account'
import { useAuth } from '@/components/auth/use-auth'

export interface UseCollections {
  collections: CollectionSummary[]
  loading: boolean
  error: string | null
  /** true si le plan FREE a atteint son plafond (2). */
  atLimit: boolean
  create: (name: string, description?: string) => Promise<void>
  remove: (id: string) => Promise<void>
  reload: () => void
}

/** Collections de l'utilisateur, avec création/suppression et garde freemium. */
export function useCollections(): UseCollections {
  const { ready, configured, userId, isPro } = useAuth()
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const load = async () => {
      if (!configured) {
        setCollections([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const rows = await listCollections()
        if (!cancelled) setCollections(rows)
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

  const create = useCallback(
    async (name: string, description?: string) => {
      if (!userId) throw new Error('Connecte-toi pour créer une collection.')
      const created = await createCollection(userId, name, description)
      setCollections((prev) => [created, ...prev])
    },
    [userId],
  )

  const remove = useCallback(async (id: string) => {
    await deleteCollection(id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const atLimit = !isPro && collections.length >= FREE_LIMITS.collections

  return { collections, loading, error, atLimit, create, remove, reload }
}
