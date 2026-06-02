import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCouncil,
  deleteCouncil,
  listCouncils,
  updateCouncil,
  FREE_LIMITS,
  PRO_LIMITS,
  type CouncilDraft,
  type CouncilRecord,
} from '@/lib/account'
import { useAuth } from '@/components/auth/use-auth'

export interface UseCouncils {
  presets: CouncilRecord[]
  mine: CouncilRecord[]
  loading: boolean
  error: string | null
  /** true si le plafond de councils personnels est atteint pour le plan courant. */
  atLimit: boolean
  limit: number
  create: (draft: CouncilDraft) => Promise<void>
  update: (id: string, draft: CouncilDraft) => Promise<void>
  remove: (id: string) => Promise<void>
  reload: () => void
}

/** Councils visibles (presets système + ceux de l'utilisateur), avec CRUD. */
export function useCouncils(): UseCouncils {
  const { ready, configured, userId, isPro } = useAuth()
  const [all, setAll] = useState<CouncilRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const load = async () => {
      if (!configured) {
        setAll([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const rows = await listCouncils()
        if (!cancelled) setAll(rows)
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
    async (draft: CouncilDraft) => {
      if (!userId) throw new Error('Connecte-toi pour composer un council.')
      const created = await createCouncil(userId, draft)
      setAll((prev) => [created, ...prev])
    },
    [userId],
  )

  const update = useCallback(async (id: string, draft: CouncilDraft) => {
    await updateCouncil(id, draft)
    setAll((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              name: draft.name,
              description: draft.description ?? null,
              delegates: draft.delegates,
              chairman_model: draft.chairman_model,
            }
          : c,
      ),
    )
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteCouncil(id)
    setAll((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const presets = useMemo(() => all.filter((c) => c.is_preset), [all])
  const mine = useMemo(() => all.filter((c) => !c.is_preset), [all])
  const limit = isPro ? PRO_LIMITS.councils : FREE_LIMITS.councils
  const atLimit = mine.length >= limit

  return { presets, mine, loading, error, atLimit, limit, create, update, remove, reload }
}
