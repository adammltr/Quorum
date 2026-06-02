/**
 * Récupération du bundle public d'un run partagé (page /q/{slug}).
 *
 * Appelle la RPC SECURITY DEFINER `get_shared_run` (incrémente view_count une
 * fois par vue humaine) avec la clé anon — aucune donnée privée n'est exposée,
 * seuls les partages actifs sont lisibles. En mode démo (backend non
 * configuré), renvoie un bundle factice pour que la page reste démontable.
 */

import { isMockMode } from '@/lib/council-client'
import type { CouncilSnapshot, RankingEntry, ResponseStatus } from '@/lib/db-helpers'

export interface PublicResponse {
  slot: string
  model_id: string
  content: string | null
  status: ResponseStatus
  latency_ms: number | null
}

export interface PublicReview {
  reviewer_slot: string
  ranking: RankingEntry[]
}

export interface PublicVerdict {
  body: string
  consensus_score: number
  disagreements: string[]
  borda_scores: Record<string, number>
}

export interface PublicRunBundle {
  run: {
    id: string
    status: string
    created_at: string
    council_snapshot: CouncilSnapshot
  }
  question: string
  responses: PublicResponse[]
  reviews: PublicReview[]
  verdict: PublicVerdict | null
}

/**
 * Charge un run partagé par son slug. Renvoie `null` si le slug est inconnu ou
 * le partage révoqué (→ page 404 soignée).
 */
export async function fetchSharedRun(slug: string): Promise<PublicRunBundle | null> {
  if (isMockMode() || slug === 'demo') return MOCK_BUNDLE

  const { supabase } = await import('@/lib/supabase')
  const { data, error } = await supabase.rpc('get_shared_run', { p_slug: slug })
  if (error) throw new Error(error.message)
  if (!data) return null
  return data as unknown as PublicRunBundle
}

// ─── Bundle de démonstration (mode mock) ─────────────────────────────────────

const MOCK_SNAPSHOT: CouncilSnapshot = {
  delegates: [
    { slot: 'A', model_id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B' },
    { slot: 'B', model_id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B' },
    { slot: 'C', model_id: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B' },
    { slot: 'D', model_id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B' },
  ],
  chairman_model: 'meta-llama/llama-3.3-70b-instruct:free',
}

const MOCK_BUNDLE: PublicRunBundle = {
  run: {
    id: 'mock-run',
    status: 'degraded',
    created_at: new Date().toISOString(),
    council_snapshot: MOCK_SNAPSHOT,
  },
  question: 'La conscience peut-elle être simulée, ou est-elle fondamentalement biologique ?',
  responses: [
    {
      slot: 'A',
      model_id: MOCK_SNAPSHOT.delegates[0]!.model_id,
      content:
        "La conscience résiste à toute réduction simple. Sous une lecture fonctionnaliste, ce qui compte n'est pas le substrat — neurones ou silicium — mais l'organisation causale des états internes. Rien n'interdit donc, en principe, une simulation fidèle.",
      status: 'complete',
      latency_ms: 4200,
    },
    {
      slot: 'B',
      model_id: MOCK_SNAPSHOT.delegates[1]!.model_id,
      content: null,
      status: 'error',
      latency_ms: null,
    },
    {
      slot: 'C',
      model_id: MOCK_SNAPSHOT.delegates[2]!.model_id,
      content:
        "Court mais net : la conscience paraît substrat-indépendante en théorie. En pratique, nous n'avons aucun critère opérationnel pour la détecter ailleurs qu'en nous-mêmes.",
      status: 'complete',
      latency_ms: 2600,
    },
    {
      slot: 'D',
      model_id: MOCK_SNAPSHOT.delegates[3]!.model_id,
      content:
        "Selon la théorie de l'information intégrée, une machine pourrait être consciente si son architecture maximise Φ — ce que les architectures feed-forward actuelles ne font pas. La biologie ne serait pas nécessaire, mais l'organisation, elle, le serait.",
      status: 'complete',
      latency_ms: 5100,
    },
  ],
  reviews: [
    { reviewer_slot: 'C', ranking: [] },
    { reviewer_slot: 'A', ranking: [] },
    { reviewer_slot: 'D', ranking: [] },
  ],
  verdict: {
    body: "L'assemblée converge sur un point essentiel : rien, en principe, n'interdit qu'une conscience émerge d'un substrat non biologique. Ce qui compte n'est pas la matière, mais l'organisation causale qui la traverse.\n\nLe désaccord, lui, est précieux : il porte sur le seuil. Reproduire les fonctions de l'esprit suffit-il à faire naître une expérience vécue, ou manque-t-il toujours ce témoin intérieur que nul test ne sait déceler ?",
    consensus_score: 71,
    disagreements: [
      'Le substrat biologique est-il nécessaire, ou seulement l’organisation causale ?',
      'Reproduire les fonctions garantit-il l’émergence d’une expérience subjective ?',
    ],
    borda_scores: { A: 6, D: 4, C: 2 },
  },
}
