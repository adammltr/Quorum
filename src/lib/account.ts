/**
 * Couche d'accès « compte & rétention » — requêtes typées au-dessus de Supabase.
 *
 * Tout passe par la clé anon + RLS : un utilisateur ne lit/écrit QUE ses
 * données (auth.uid()). Les plafonds freemium sont doublés côté serveur
 * (triggers, migration 0016) ; on les expose ici pour un retour UI immédiat.
 *
 * Le client Supabase est importé paresseusement : le module lève à l'évaluation
 * si l'environnement n'est pas configuré, donc on ne l'importe qu'au besoin
 * (l'app reste démarrable en mode démo sans backend).
 */

import type { Json } from '@/lib/database.types'
import type {
  CouncilSnapshot,
  Delegate,
  RunMode,
  RunStatus,
} from '@/lib/db-helpers'
import { isFreeModel } from '@/lib/models-catalog'
import { FREE_TIER, PRO_TIER } from '@/config/billing'

/** Sérialise des délégués typés vers la colonne jsonb (`delegates`). */
function delegatesJson(delegates: Delegate[]): Json {
  return delegates as unknown as Json
}

// ─── Plafonds freemium (dérivés de la config centrale — cf. @/config/billing) ─
export const FREE_LIMITS = {
  collections: FREE_TIER.collections,
  councils: FREE_TIER.councils,
  historyDays: FREE_TIER.historyDays,
} as const

export const PRO_LIMITS = {
  councils: PRO_TIER.councils,
} as const

// ─── Formes métier ──────────────────────────────────────────────────────────

export interface VerdictPreview {
  consensus_score: number
  body: string
  disagreements: string[]
  borda_scores: Record<string, number>
}

/** Une ligne d'historique : run + question + aperçu du verdict. */
export interface HistoryItem {
  id: string
  created_at: string
  status: RunStatus
  expires_at: string | null
  council_id: string | null
  council_snapshot: CouncilSnapshot
  question: string
  verdict: VerdictPreview | null
}

export interface CollectionSummary {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  item_count: number
}

export interface CouncilRecord {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  delegates: Delegate[]
  chairman_model: string
  is_preset: boolean
  is_default: boolean
  created_at: string
}

export interface CouncilDraft {
  name: string
  description?: string | null
  delegates: Delegate[]
  chairman_model: string
}

// ─── Client paresseux ───────────────────────────────────────────────────────

async function db() {
  const mod = await import('@/lib/supabase')
  await mod.ensureSession()
  return mod.supabase
}

// ─── Mapping bas niveau (jsonb / embeds → formes métier) ────────────────────

interface RawHistoryRow {
  id: string
  created_at: string
  status: string
  expires_at: string | null
  council_id: string | null
  council_snapshot: CouncilSnapshot
  question: { body: string } | { body: string }[] | null
  verdict:
    | {
        consensus_score: number
        body: string
        disagreements: unknown
        borda_scores: unknown
      }
    | {
        consensus_score: number
        body: string
        disagreements: unknown
        borda_scores: unknown
      }[]
    | null
}

function one<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function mapHistory(row: RawHistoryRow): HistoryItem {
  const q = one(row.question)
  const v = one(row.verdict)
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status as RunStatus,
    expires_at: row.expires_at,
    council_id: row.council_id,
    council_snapshot: row.council_snapshot,
    question: q?.body ?? '',
    verdict: v
      ? {
          consensus_score: v.consensus_score,
          body: v.body,
          disagreements: Array.isArray(v.disagreements) ? (v.disagreements as string[]) : [],
          borda_scores:
            v.borda_scores && typeof v.borda_scores === 'object'
              ? (v.borda_scores as Record<string, number>)
              : {},
        }
      : null,
  }
}

const HISTORY_SELECT =
  'id, created_at, status, expires_at, council_id, council_snapshot, ' +
  'question:questions!inner(body), ' +
  'verdict:verdicts(consensus_score, body, disagreements, borda_scores)'

// ─── Historique ─────────────────────────────────────────────────────────────

/**
 * Historique des runs de l'utilisateur, du plus récent au plus ancien.
 * La RLS limite déjà au propriétaire ; en FREE, seuls les runs < 7 j existent
 * (purge serveur). La recherche se fait côté client (sous-chaîne sur l'énoncé).
 */
export async function listHistory(limit = 200): Promise<HistoryItem[]> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('runs')
    .select(HISTORY_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<RawHistoryRow[]>()
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapHistory)
}

export async function deleteRun(runId: string): Promise<void> {
  const supabase = await db()
  const { error } = await supabase.from('runs').delete().eq('id', runId)
  if (error) throw new Error(error.message)
}

/**
 * Nombre de questions déjà consommées AUJOURD'HUI (jour UTC, comme le serveur).
 * Lecture seule (n'incrémente pas) — sert au compteur discret du composer.
 * Renvoie 0 si aucune ligne (pas encore de question aujourd'hui).
 */
export async function fetchTodayUsage(): Promise<number> {
  const supabase = await db()
  const today = new Date().toISOString().slice(0, 10) // date UTC (YYYY-MM-DD)
  const { data, error } = await supabase
    .from('daily_usage')
    .select('question_count')
    .eq('day', today)
    .maybeSingle<{ question_count: number }>()
  if (error) throw new Error(error.message)
  return data?.question_count ?? 0
}

// ─── Collections ────────────────────────────────────────────────────────────

interface RawCollectionRow {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  items: { count: number }[]
}

export async function listCollections(): Promise<CollectionSummary[]> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('collections')
    .select('id, name, description, is_public, created_at, items:collection_items(count)')
    .order('created_at', { ascending: false })
    .returns<RawCollectionRow[]>()
  if (error) throw new Error(error.message)
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    is_public: c.is_public,
    created_at: c.created_at,
    item_count: c.items?.[0]?.count ?? 0,
  }))
}

export async function createCollection(
  ownerId: string,
  name: string,
  description?: string,
): Promise<CollectionSummary> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('collections')
    .insert({ owner_id: ownerId, name: name.trim(), description: description?.trim() || null })
    .select('id, name, description, is_public, created_at')
    .single()
  if (error) throw friendlyLimitError(error.message, 'collection')
  return { ...data, item_count: 0 }
}

export async function deleteCollection(id: string): Promise<void> {
  const supabase = await db()
  const { error } = await supabase.from('collections').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setCollectionPublic(id: string, isPublic: boolean): Promise<void> {
  const supabase = await db()
  const { error } = await supabase.from('collections').update({ is_public: isPublic }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listCollectionRuns(collectionId: string): Promise<HistoryItem[]> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('collection_items')
    .select(`run:runs(${HISTORY_SELECT})`)
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false })
    .returns<{ run: RawHistoryRow | RawHistoryRow[] | null }[]>()
  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((r) => one(r.run))
    .filter((r): r is RawHistoryRow => r !== null)
    .map(mapHistory)
}

/** Collections contenant déjà un run donné (pour cocher l'état dans l'UI). */
export async function collectionsContainingRun(runId: string): Promise<Set<string>> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('collection_items')
    .select('collection_id')
    .eq('run_id', runId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => r.collection_id))
}

export async function addRunToCollection(collectionId: string, runId: string): Promise<void> {
  const supabase = await db()
  const { error } = await supabase
    .from('collection_items')
    .insert({ collection_id: collectionId, run_id: runId })
  // 23505 = doublon (déjà épinglé) : silencieux, l'intention est satisfaite.
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function removeRunFromCollection(collectionId: string, runId: string): Promise<void> {
  const supabase = await db()
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('run_id', runId)
  if (error) throw new Error(error.message)
}

// ─── Councils ───────────────────────────────────────────────────────────────

interface RawCouncilRow {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  delegates: unknown
  chairman_model: string
  is_preset: boolean
  is_default: boolean
  created_at: string
}

function mapCouncil(row: RawCouncilRow): CouncilRecord {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    description: row.description,
    delegates: Array.isArray(row.delegates) ? (row.delegates as Delegate[]) : [],
    chairman_model: row.chairman_model,
    is_preset: row.is_preset,
    is_default: row.is_default,
    created_at: row.created_at,
  }
}

/** Councils visibles : presets système + ceux détenus par l'utilisateur. */
export async function listCouncils(): Promise<CouncilRecord[]> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('councils')
    .select('id, owner_id, name, description, delegates, chairman_model, is_preset, is_default, created_at')
    .order('is_preset', { ascending: false })
    .order('created_at', { ascending: false })
    .returns<RawCouncilRow[]>()
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapCouncil)
}

/** Un council par son id (preset ou détenu, selon la RLS). null si introuvable. */
export async function getCouncil(id: string): Promise<CouncilRecord | null> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('councils')
    .select('id, owner_id, name, description, delegates, chairman_model, is_preset, is_default, created_at')
    .eq('id', id)
    .maybeSingle<RawCouncilRow>()
  if (error) throw new Error(error.message)
  return data ? mapCouncil(data) : null
}

export async function createCouncil(ownerId: string, draft: CouncilDraft): Promise<CouncilRecord> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('councils')
    .insert({
      owner_id: ownerId,
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      delegates: delegatesJson(draft.delegates),
      chairman_model: draft.chairman_model,
      is_preset: false,
      is_default: false,
    })
    .select('id, owner_id, name, description, delegates, chairman_model, is_preset, is_default, created_at')
    .single<RawCouncilRow>()
  if (error) throw friendlyLimitError(error.message, 'council')
  return mapCouncil(data)
}

export async function updateCouncil(id: string, draft: CouncilDraft): Promise<void> {
  const supabase = await db()
  const { error } = await supabase
    .from('councils')
    .update({
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      delegates: delegatesJson(draft.delegates),
      chairman_model: draft.chairman_model,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCouncil(id: string): Promise<void> {
  const supabase = await db()
  const { error } = await supabase.from('councils').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Mode d'exécution requis par un council : BYOK si un modèle premium y figure. */
export function councilMode(council: { delegates: Delegate[]; chairman_model: string }): RunMode {
  const allFree =
    council.delegates.every((d) => isFreeModel(d.model_id)) && isFreeModel(council.chairman_model)
  return allFree ? 'demo' : 'byok'
}

// ─── Erreurs ────────────────────────────────────────────────────────────────

/** Traduit les exceptions de plafond serveur (triggers 0016) en message clair. */
function friendlyLimitError(message: string, kind: 'collection' | 'council'): Error {
  if (message.includes('free_collection_limit')) {
    return new Error('Plan gratuit : 2 collections maximum. Passe en PRO pour un nombre illimité.')
  }
  if (message.includes('free_council_limit')) {
    return new Error('Plan gratuit : 1 council perso. Passe en PRO pour en composer jusqu’à 10.')
  }
  return new Error(message || `Action sur ${kind} impossible.`)
}
