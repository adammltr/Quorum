/**
 * Edge Function `generate-daily-questions` — générateur automatique de QdJ.
 *
 * Appelée par pg_cron chaque DIMANCHE 18h UTC (voir migration 0018). En un seul
 * appel, génère les 7 Questions du Jour de la semaine SUIVANTE (lundi→dimanche)
 * et les insère en `published=false`. Un second cron (quotidien 8h UTC) les
 * publie 24h avant leur date prévue.
 *
 * Pipeline :
 *   1. Authentification par CRON_SECRET (header Authorization) — non publique.
 *   2. Calcul des 7 dates de la semaine suivante encore dépourvues de QdJ.
 *   3. Génération via OpenRouter (chairman par défaut) — questions à FORT
 *      potentiel de divergence entre LLMs (dilemmes, arbitrages de valeurs).
 *   4. Validation stricte (JSON, longueur 50–200) + déduplication sur 30 jours.
 *   5. Complétion par la banque de secours si < 7 questions valides.
 *   6. Insertion (questions + daily_question, published=false, scheduled_for).
 *
 * Dégradation gracieuse : toute panne OpenRouter bascule sur la banque de
 * secours → JAMAIS de jour sans QdJ. La clé OpenRouter n'est jamais journalisée.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { corsHeaders, handlePreflight } from '../_shared/cors.ts'
import { streamChatCompletion } from '../_shared/openrouter.ts'
import { DEFAULT_CHAIRMAN } from '../_shared/models.ts'
import { FALLBACK_QUESTIONS, type GeneratedQuestion } from './fallback.ts'

/** Council officiel de référence de la QdJ (preset « Assemblée démo », seed 0013). */
const DEFAULT_COUNCIL_ID = '00000000-0000-0000-0000-0000000c0de1'

const QUESTIONS_PER_WEEK = 7
const MIN_LEN = 50
const MAX_LEN = 200
/** Fenêtre de déduplication : on ne reprend pas une question des 30 derniers jours. */
const DEDUP_WINDOW_DAYS = 30
/** Seuil de similarité (Jaccard sur tokens) au-delà duquel deux questions sont jugées doublons. */
const SIMILARITY_THRESHOLD = 0.5

function mustEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`)
  return v
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Formate une Date en clé naturelle AAAA-MM-JJ (UTC). */
function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Les 7 dates (UTC) de la semaine SUIVANTE, lundi → dimanche. Quel que soit le
 * jour d'exécution, on vise toujours le lundi de la semaine d'après.
 */
function nextWeekDates(from = new Date()): string[] {
  const base = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const dow = base.getUTCDay() // 0 = dimanche … 6 = samedi
  // Jours jusqu'au prochain lundi ; 0 → on force +7 (toujours la semaine suivante).
  const toMonday = ((1 - dow + 7) % 7) || 7
  const monday = new Date(base)
  monday.setUTCDate(base.getUTCDate() + toMonday)
  return Array.from({ length: QUESTIONS_PER_WEEK }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return toIsoDay(d)
  })
}

// ─── Normalisation / similarité (déduplication) ──────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritiques combinants
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(text: string): Set<string> {
  // On ignore les mots très courts (articles, prépositions) pour comparer le fond.
  return new Set(normalize(text).split(' ').filter((w) => w.length > 3))
}

/** Indice de Jaccard entre deux ensembles de tokens (0 = disjoint, 1 = identique). */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  return inter / (a.size + b.size - inter)
}

/** true si `candidate` ressemble trop à l'une des questions déjà connues. */
function isDuplicate(candidate: string, known: Set<string>[]): boolean {
  const t = tokens(candidate)
  return known.some((k) => jaccard(t, k) >= SIMILARITY_THRESHOLD)
}

// ─── Génération OpenRouter ───────────────────────────────────────────────────

const GENERATION_SYSTEM =
  "Tu es l'éditeur des « Questions du Jour » de Quorum, une assemblée de 4 IA qui " +
  'délibèrent puis tranchent. Ton rôle : produire des questions à FORT potentiel de ' +
  'DIVERGENCE entre modèles de langage — des dilemmes éthiques, des arbitrages de ' +
  'valeurs, des questions ouvertes sans consensus établi, là où des esprits rigoureux ' +
  'aboutiraient à des conclusions différentes. Évite le factuel à réponse unique, les ' +
  'questions techniques fermées et les sujets à réponse évidente.'

function buildGenerationPrompt(count: number, avoid: string[]): string {
  const avoidList = avoid.length > 0
    ? `\n\nÉVITE absolument toute question similaire à celles-ci (déjà posées récemment) :\n${avoid.map((q) => `- ${q}`).join('\n')}`
    : ''
  return (
    `Génère exactement ${count} questions distinctes, en FRANÇAIS, pour les prochains jours.\n\n` +
    'Contraintes IMPÉRATIVES par question :\n' +
    `- entre ${MIN_LEN} et ${MAX_LEN} caractères (ponctuation comprise) ;\n` +
    '- une seule phrase interrogative, claire et autonome ;\n' +
    '- maximise la divergence probable entre IA (dilemme, valeurs en tension) ;\n' +
    '- thèmes variés entre les questions (éthique, société, technologie, existence, pouvoir…).\n\n' +
    'Réponds UNIQUEMENT par un tableau JSON strict, sans texte autour, sans bloc de code, ' +
    'de la forme :\n' +
    '[{"question":"…","theme":"…","expected_divergence":"high|medium"}]' +
    avoidList
  )
}

/** Extrait et valide le tableau JSON renvoyé par le modèle. Renvoie [] si invalide. */
function parseGenerated(raw: string): GeneratedQuestion[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const out: GeneratedQuestion[] = []
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue
    const rec = item as Record<string, unknown>
    const question = typeof rec.question === 'string' ? rec.question.trim() : ''
    const theme = typeof rec.theme === 'string' && rec.theme.trim() ? rec.theme.trim() : 'Général'
    const div = rec.expected_divergence === 'high' || rec.expected_divergence === 'medium'
      ? rec.expected_divergence
      : 'medium'
    if (question.length < MIN_LEN || question.length > MAX_LEN) continue
    out.push({ question, theme, expected_divergence: div })
  }
  return out
}

async function generateViaOpenRouter(count: number, avoid: string[]): Promise<GeneratedQuestion[]> {
  const apiKey = mustEnv('OPENROUTER_API_KEY')
  // Température élevée : on cherche de la variété, pas du déterminisme.
  const { content } = await streamChatCompletion({
    apiKey,
    model: DEFAULT_CHAIRMAN,
    temperature: 1.0,
    messages: [
      { role: 'system', content: GENERATION_SYSTEM },
      { role: 'user', content: buildGenerationPrompt(count, avoid) },
    ],
  })
  return parseGenerated(content)
}

// ─── Sélection finale (dédup + complétion par la banque de secours) ──────────

/**
 * Compose `count` questions valides et non dupliquées, en partant de `generated`
 * puis en complétant avec la banque de secours. Garantit `count` questions.
 */
function composeFinal(
  generated: GeneratedQuestion[],
  recent: Set<string>[],
  count: number,
): { picked: GeneratedQuestion[]; usedFallback: boolean } {
  const picked: GeneratedQuestion[] = []
  const known = [...recent]
  let usedFallback = false

  const tryAdd = (q: GeneratedQuestion): void => {
    if (picked.length >= count) return
    if (q.question.length < MIN_LEN || q.question.length > MAX_LEN) return
    if (isDuplicate(q.question, known)) return
    picked.push(q)
    known.push(tokens(q.question))
  }

  for (const q of generated) tryAdd(q)

  if (picked.length < count) {
    usedFallback = true
    // Banque de secours mélangée pour varier d'une semaine à l'autre.
    const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5)
    for (const q of shuffled) tryAdd(q)
  }

  return { picked, usedFallback }
}

// ─── Accès données ────────────────────────────────────────────────────────────

/** Énoncés des QdJ des 30 derniers jours + des entrées déjà planifiées (dédup). */
async function fetchRecentQuestions(service: SupabaseClient): Promise<string[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - DEDUP_WINDOW_DAYS)
  const { data, error } = await service
    .from('daily_question')
    .select('questions(body)')
    .gte('day', toIsoDay(since))
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as { questions: { body: string } | { body: string }[] | null }[]
  const bodies: string[] = []
  for (const r of rows) {
    const q = Array.isArray(r.questions) ? r.questions[0] : r.questions
    if (q?.body) bodies.push(q.body)
  }
  return bodies
}

/** Dates de la liste qui n'ont pas encore de QdJ (la colonne `day` est unique). */
async function fetchMissingDates(service: SupabaseClient, dates: string[]): Promise<string[]> {
  const { data, error } = await service
    .from('daily_question')
    .select('day')
    .in('day', dates)
  if (error) throw new Error(error.message)
  const existing = new Set((data ?? []).map((r) => (r as { day: string }).day))
  return dates.filter((d) => !existing.has(d))
}

/** Insère une question + sa QdJ planifiée (published=false). Renvoie true si insérée. */
async function insertDaily(
  service: SupabaseClient,
  day: string,
  q: GeneratedQuestion,
): Promise<boolean> {
  const { data: question, error: qErr } = await service
    .from('questions')
    .insert({ body: q.question, is_editorial: true })
    .select('id')
    .single()
  if (qErr || !question) throw new Error(qErr?.message ?? 'Insertion question impossible.')

  const { error: dErr } = await service.from('daily_question').insert({
    day,
    scheduled_for: day,
    question_id: (question as { id: string }).id,
    council_id: DEFAULT_COUNCIL_ID,
    theme: q.theme,
    published: false,
  })
  // 23505 = course (déjà inséré par un appel concurrent) : non bloquant.
  if (dErr && dErr.code !== '23505') throw new Error(dErr.message)
  return !dErr
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handlePreflight()
  if (req.method !== 'POST') return json({ error: 'POST requis.' }, 405)

  // ── Auth : secret de cron (jamais public) ──────────────────────────────────
  const expected = mustEnv('CRON_SECRET')
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token !== expected) return json({ error: 'Non autorisé.' }, 401)

  try {
    const service = createClient(mustEnv('SUPABASE_URL'), mustEnv('SUPABASE_SERVICE_ROLE_KEY'))

    const targetDates = nextWeekDates()
    const missing = await fetchMissingDates(service, targetDates)
    if (missing.length === 0) {
      return json({ ok: true, message: 'Semaine déjà complète.', dates: targetDates, inserted: 0 })
    }

    const recentBodies = await fetchRecentQuestions(service)
    const recent = recentBodies.map(tokens)

    // Génération (best-effort) → dégradation gracieuse sur la banque de secours.
    let generated: GeneratedQuestion[] = []
    let openrouterFailed = false
    let openrouterError: string | null = null
    try {
      generated = await generateViaOpenRouter(missing.length, recentBodies.slice(0, 30))
    } catch (err) {
      // On bascule sur la banque de secours, mais on remonte la cause (sans
      // jamais exposer la clé) pour l'observabilité (logs + réponse cron).
      openrouterFailed = true
      openrouterError = err instanceof Error ? err.message : String(err)
      console.error('generate-daily-questions: génération OpenRouter échouée:', openrouterError)
    }

    const { picked, usedFallback } = composeFinal(generated, recent, missing.length)

    let inserted = 0
    for (let i = 0; i < missing.length && i < picked.length; i++) {
      if (await insertDaily(service, missing[i], picked[i])) inserted++
    }

    return json({
      ok: true,
      dates: missing,
      inserted,
      generated: generated.length,
      used_fallback: usedFallback || openrouterFailed,
      openrouter_failed: openrouterFailed,
      openrouter_error: openrouterError,
    })
  } catch (err) {
    // On ne propage jamais de détail interne sensible.
    console.error('generate-daily-questions:', err instanceof Error ? err.message : 'erreur')
    return json({ error: 'Erreur interne lors de la génération.' }, 500)
  }
})
