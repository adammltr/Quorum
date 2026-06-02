/**
 * Rituel quotidien — Question du Jour (SPEC §5).
 *
 * Une question éditoriale par jour, la même pour tous (modèle Wordle), à
 * laquelle on convoque l'assemblée. Ce module porte :
 *   • la lecture de la QdJ + de l'archive publique (RPC, lecture anonyme ok) ;
 *   • l'enregistrement de la participation (relie le run, renvoie la comparaison
 *     sociale + le streak) ;
 *   • la carte de partage façon Wordle (texte spoiler-free) ;
 *   • le rappel opt-in ÉTHIQUE : un événement .ics récurrent généré côté client,
 *     jamais une notification poussée (cf. SPEC §5 « streaks éthiques »).
 *
 * En mode démo (backend non configuré), tout dégrade vers des données factices
 * pour rester démontable sans Supabase.
 */

import { isMockMode } from '@/lib/council-client'
import { appUrl } from '@/lib/share'

// ─── Formes métier ───────────────────────────────────────────────────────────

/** La Question du Jour pour une date (clé naturelle `day` = AAAA-MM-JJ). */
export interface DailyBundle {
  id: string
  day: string
  question: string
  councilId: string | null
  aggregateConsensus: number | null
  participantCount: number
}

/** Streak de participation (éthique : on n'expose que des compteurs positifs). */
export interface Streak {
  current: number
  longest: number
}

/** Comparaison sociale renvoyée après participation à la QdJ. */
export interface DailyResult {
  day: string
  yourScore: number | null
  aggregateConsensus: number | null
  participantCount: number
  /** % de participants au consensus ≤ au tien (positionnement doux). */
  percentile: number | null
  /** % de participants ayant atteint un consensus ≥ 60. */
  agreementRate: number | null
  streak: Streak
}

/** Une entrée d'archive (page consultable + SEO). */
export interface DailyArchiveEntry {
  day: string
  question: string
  aggregateConsensus: number | null
  participantCount: number
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Jour courant en UTC, au format AAAA-MM-JJ (clé naturelle de la QdJ). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

/** true si `day` est antérieur à aujourd'hui (UTC) → entrée d'archive figée. */
export function isPastDay(day: string): boolean {
  return day < todayUtc()
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
export function isValidDay(day: string): boolean {
  return DAY_RE.test(day)
}

/** Format lisible FR (ex. « lundi 2 juin 2026 »). Robuste si l'entrée est invalide. */
export function formatDayFr(day: string): string {
  if (!isValidDay(day)) return day
  const d = new Date(`${day}T00:00:00Z`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Format court FR (ex. « 02/06/2026 ») — pour le texte de partage Wordle. */
export function formatDayShort(day: string): string {
  if (!isValidDay(day)) return day
  const [y, m, d] = day.split('-')
  return `${d}/${m}/${y}`
}

// ─── URLs ──────────────────────────────────────────────────────────────────

/** Chemin interne de la QdJ d'une date. */
export function dailyPath(day: string): string {
  return `/jour/${day}`
}

/** URL publique absolue de la QdJ d'une date (partage). */
export function dailyUrl(day: string): string {
  return `${appUrl()}${dailyPath(day)}`
}

// ─── Lecture (RPC publiques) ─────────────────────────────────────────────────

async function rpcDb() {
  const mod = await import('@/lib/supabase')
  return mod.supabase
}

/** La QdJ d'une date (défaut : aujourd'hui). null si absente / non publiée. */
export async function getDailyQuestion(day?: string): Promise<DailyBundle | null> {
  const target = day ?? todayUtc()
  if (isMockMode()) return mockBundle(target)

  const supabase = await rpcDb()
  const { data, error } = await supabase.rpc('get_daily_question', { p_day: target })
  if (error) throw new Error(error.message)
  if (!data) return null
  const d = data as unknown as {
    id: string
    day: string
    question: string
    council_id: string | null
    aggregate_consensus: number | null
    participant_count: number
  }
  return {
    id: d.id,
    day: d.day,
    question: d.question,
    councilId: d.council_id,
    aggregateConsensus: d.aggregate_consensus,
    participantCount: d.participant_count ?? 0,
  }
}

/** Archive publique des QdJ passées/du jour (récentes d'abord). */
export async function listDailyArchive(limit = 60, offset = 0): Promise<DailyArchiveEntry[]> {
  if (isMockMode()) return mockArchive()

  const supabase = await rpcDb()
  const { data, error } = await supabase.rpc('list_daily_questions', {
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as {
    day: string
    question: string
    aggregate_consensus: number | null
    participant_count: number
  }[]
  return rows.map((r) => ({
    day: r.day,
    question: r.question,
    aggregateConsensus: r.aggregate_consensus,
    participantCount: r.participant_count ?? 0,
  }))
}

/**
 * Enregistre la participation d'un run terminé à la QdJ d'une date et renvoie la
 * comparaison sociale + le streak. Idempotent côté serveur (un jour = un compte).
 */
export async function recordDailyParticipation(runId: string, day?: string): Promise<DailyResult> {
  const target = day ?? todayUtc()
  if (isMockMode() || runId === 'mock-run') return mockResult(target)

  const { supabase, ensureSession } = await import('@/lib/supabase')
  await ensureSession()
  const { data, error } = await supabase.rpc('record_daily_participation', {
    p_run_id: runId,
    p_day: target,
  })
  if (error || !data) {
    throw new Error(error?.message ?? 'Participation impossible pour le moment.')
  }
  const d = data as unknown as {
    day: string
    your_score: number | null
    aggregate_consensus: number | null
    participant_count: number
    percentile: number | null
    agreement_rate: number | null
    streak: { current: number; longest: number }
  }
  markParticipatedLocally(target)
  return {
    day: d.day,
    yourScore: d.your_score,
    aggregateConsensus: d.aggregate_consensus,
    participantCount: d.participant_count ?? 0,
    percentile: d.percentile,
    agreementRate: d.agreement_rate,
    streak: { current: d.streak?.current ?? 1, longest: d.streak?.longest ?? 1 },
  }
}

// ─── Mémoire locale (« déjà fait aujourd'hui », sans backend) ────────────────

const PARTICIPATED_KEY = 'quorum.daily.participated'

/** true si l'utilisateur a déjà répondu à la QdJ de cette date (sur cet appareil). */
export function hasParticipatedLocally(day: string): boolean {
  try {
    return localStorage.getItem(PARTICIPATED_KEY) === day
  } catch {
    return false
  }
}

function markParticipatedLocally(day: string): void {
  try {
    localStorage.setItem(PARTICIPATED_KEY, day)
  } catch {
    /* stockage indisponible : on ignore, ce n'est qu'un indice UI */
  }
}

// ─── Partage Wordle (texte spoiler-free) ─────────────────────────────────────

export interface DailyShareTextInput {
  day: string
  grid: string
  consensusScore: number | null
}

/**
 * Texte de partage façon Wordle : reconnaissable, daté, sans révéler le verdict.
 *   Quorum du 02/06/2026
 *   🟢🟡🟠🟢 · 72% de consensus
 *   <url>
 */
export function buildDailyShareText({ day, grid, consensusScore }: DailyShareTextInput): string {
  const lines = [`Quorum du ${formatDayShort(day)}`]
  lines.push(consensusScore !== null ? `${grid} · ${consensusScore}% de consensus` : grid)
  lines.push(dailyUrl(day))
  return lines.join('\n')
}

// ─── Rappel opt-in ÉTHIQUE (événement .ics, jamais de notification poussée) ──

/**
 * Génère un événement de calendrier récurrent quotidien (rappel doux du
 * rendez-vous). 100% côté client : l'utilisateur l'ajoute à SON agenda s'il le
 * souhaite — aucune donnée envoyée, aucune notification imposée.
 */
export function buildDailyReminderIcs(hour = 9): string {
  const hh = String(Math.min(23, Math.max(0, hour))).padStart(2, '0')
  // Première occurrence : aujourd'hui à hh:00 (heure locale, sans TZ stricte).
  const today = todayUtc().replace(/-/g, '')
  const stamp = `${today}T${hh}0000`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quorum//Question du Jour//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:quorum-daily-${today}@quorum.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${stamp}`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Quorum — Question du Jour',
    'DESCRIPTION:Convoquez l\'assemblée sur la question du jour.',
    `URL:${appUrl()}/jour`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

/** Déclenche le téléchargement du rappel .ics (opt-in explicite de l'utilisateur). */
export function downloadDailyReminder(hour = 9): void {
  try {
    const blob = new Blob([buildDailyReminderIcs(hour)], { type: 'text/calendar;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'quorum-question-du-jour.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  } catch {
    /* environnement sans DOM : on ignore */
  }
}

// ════════════════════════════════════════════════════════════════════════
// Données de démonstration (mode mock)
// ════════════════════════════════════════════════════════════════════════

function mockBundle(day: string): DailyBundle {
  const past = isPastDay(day)
  return {
    id: 'mock-daily',
    day,
    question: MOCK_QUESTIONS[day] ?? 'Faut-il avoir le droit d’être oublié par les machines ?',
    councilId: null,
    aggregateConsensus: past ? 68 : 71,
    participantCount: past ? 1240 : 327,
  }
}

const MOCK_QUESTIONS: Record<string, string> = {
  '2026-06-02': 'Faut-il avoir le droit d’être oublié par les machines ?',
  '2026-06-01': 'La conscience peut-elle être simulée, ou est-elle fondamentalement biologique ?',
  '2026-05-31': 'Quand croissance économique et écologie s’opposent, laquelle privilégier ?',
  '2026-05-30': 'Pour diriger, vaut-il mieux être craint ou aimé ?',
}

function mockArchive(): DailyArchiveEntry[] {
  return [
    { day: '2026-06-02', question: MOCK_QUESTIONS['2026-06-02']!, aggregateConsensus: 71, participantCount: 327 },
    { day: '2026-06-01', question: MOCK_QUESTIONS['2026-06-01']!, aggregateConsensus: 64, participantCount: 1240 },
    { day: '2026-05-31', question: MOCK_QUESTIONS['2026-05-31']!, aggregateConsensus: 58, participantCount: 980 },
    { day: '2026-05-30', question: MOCK_QUESTIONS['2026-05-30']!, aggregateConsensus: 73, participantCount: 1510 },
  ]
}

function mockResult(day: string): DailyResult {
  // Streak local simulé pour rester crédible en démo.
  let current: number
  try {
    const prev = localStorage.getItem('quorum.daily.mockStreak')
    current = prev ? Math.min(99, Number(prev) + 1) : 3
    localStorage.setItem('quorum.daily.mockStreak', String(current))
  } catch {
    current = 3
  }
  markParticipatedLocally(day)
  return {
    day,
    yourScore: 71,
    aggregateConsensus: 64,
    participantCount: 328,
    percentile: 78,
    agreementRate: 62,
    streak: { current, longest: Math.max(current, 5) },
  }
}
