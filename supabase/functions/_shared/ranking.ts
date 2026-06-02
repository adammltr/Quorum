/**
 * Cœur du Stage 2/3 — PUR (aucun I/O), donc unitairement testable.
 *
 *   • parseFinalRanking : extrait le classement d'un reviewer depuis sa sortie
 *     brute. Cherche d'abord le bloc « FINAL RANKING: » exact, sinon applique un
 *     fallback regex tolérant (FR/EN, digits ou ordinaux, étiquettes variées).
 *   • aggregateBorda     : agrège les classements en scores Borda par slot.
 *   • computeConsensus   : score de consensus objectif 0–100 (fallback Chairman).
 */

import { BORDA_POINTS } from './models.ts'

/** Résultat de parsing d'un classement de reviewer. */
export interface ParsedRanking {
  /** true si un classement complet et cohérent a été extrait. */
  ok: boolean
  /** Étiquettes (lettres) classées du 1er au dernier. Vide si !ok. */
  order: string[]
}

/** En-tête strict attendu (FR ou EN), avec tolérance de casse/espaces. */
const HEADER_RE = /(?:final\s+ranking|classement\s+final)\s*:?/i

/** Mots ordinaux → position, pour le fallback. */
const ORDINALS: Record<string, number> = {
  '1st': 1, first: 1, premier: 1, premiere: 1, première: 1,
  '2nd': 2, second: 2, seconde: 2, deuxieme: 2, deuxième: 2,
  '3rd': 3, third: 3, troisieme: 3, troisième: 3,
  '4th': 4, fourth: 4, quatrieme: 4, quatrième: 4,
}

/**
 * Capture une entrée de classement :
 *   <position> [séparateur] [mot-étiquette?] <LETTRE>
 * où position = chiffre ou ordinal, mot-étiquette = Réponse/Modèle/Model/Answer/Response.
 */
const ENTRY_RE = new RegExp(
  '(\\d+|1st|2nd|3rd|4th|first|second|third|fourth|' +
    'premi[eè]re?|deuxi[eè]me|troisi[eè]me|quatri[eè]me|seconde?)' +
    '\\s*[.)\\-:–—]?\\s*' +
    '(?:r[ée]ponse|mod[èe]le|model|answer|response)?\\s*' +
    '[«"‘’\']?\\s*' +
    '([A-Z])\\b',
  'gi',
)

/** Résout une position (chiffre ou ordinal) en entier, ou null. */
function resolvePosition(token: string): number | null {
  const t = token.toLowerCase()
  if (/^\d+$/.test(t)) {
    const n = Number(t)
    return n >= 1 && n <= 26 ? n : null
  }
  return ORDINALS[t] ?? null
}

/** Extrait un ordre position→label depuis un texte, restreint aux labels attendus. */
function extractOrder(text: string, labels: string[]): string[] {
  const allowed = new Set(labels)
  const byPosition = new Map<number, string>()
  ENTRY_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ENTRY_RE.exec(text)) !== null) {
    const pos = resolvePosition(m[1])
    const label = m[2].toUpperCase()
    if (pos === null || !allowed.has(label)) continue
    // Première occurrence d'une position gagne ; un label déjà placé est ignoré.
    if (byPosition.has(pos)) continue
    if ([...byPosition.values()].includes(label)) continue
    byPosition.set(pos, label)
  }
  // Reconstruit l'ordre sur les positions contiguës 1..N.
  const order: string[] = []
  for (let p = 1; p <= labels.length; p++) {
    const label = byPosition.get(p)
    if (label === undefined) break
    order.push(label)
  }
  return order
}

/**
 * Parse la sortie brute d'un reviewer en un classement des `expectedLabels`
 * (ex. ['A','B','C']). Renvoie `ok:false` si le classement est incomplet,
 * incohérent (doublons) ou absent → le vote sera ignoré dans l'agrégation.
 */
export function parseFinalRanking(raw: string, expectedLabels: string[]): ParsedRanking {
  const labels = expectedLabels.map((l) => l.toUpperCase())
  const header = raw.match(HEADER_RE)

  // 1) Périmètre prioritaire : ce qui suit l'en-tête « FINAL RANKING: ».
  let order: string[] = []
  if (header) {
    const scope = raw.slice((header.index ?? 0) + header[0].length)
    order = extractOrder(scope, labels)
  }
  // 2) Fallback : balayer tout le texte si le bloc n'a pas donné un ordre complet.
  if (order.length < labels.length) {
    order = extractOrder(raw, labels)
  }

  const ok = order.length === labels.length && new Set(order).size === labels.length
  return { ok, order: ok ? order : [] }
}

/** Bulletin Borda : slots RÉELS classés du 1er au dernier (déjà désanonymisés). */
export interface BordaBallot {
  ranked: string[]
}

/**
 * Agrège des bulletins en scores Borda par slot.
 * Barème `BORDA_POINTS` (1er=3, 2e=2, 3e=1) ; au-delà du barème → 0 pt.
 * `allSlots` garantit que chaque slot apparaît (même non classé → 0).
 */
export function aggregateBorda(
  ballots: BordaBallot[],
  allSlots: string[],
): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const slot of allSlots) scores[slot] = 0

  for (const ballot of ballots) {
    ballot.ranked.forEach((slot, idx) => {
      if (!(slot in scores)) scores[slot] = 0
      scores[slot] += BORDA_POINTS[idx] ?? 0
    })
  }
  return scores
}

/**
 * Score de consensus objectif 0–100, fallback si le Chairman n'en fournit pas.
 * Mesure la CONCENTRATION des points Borda : un gagnant net (tous d'accord) →
 * proche de 100 ; des points répartis uniformément (désaccord) → proche de 0.
 * Basé sur l'entropie normalisée de la distribution des scores.
 */
export function computeConsensus(bordaScores: Record<string, number>): number {
  const values = Object.values(bordaScores).filter((v) => v > 0)
  const total = values.reduce((a, b) => a + b, 0)
  const n = Object.keys(bordaScores).length

  // Pas de données exploitables ou un seul candidat : neutre / indéterminé.
  if (total === 0 || n <= 1) return 50

  let entropy = 0
  for (const v of values) {
    const p = v / total
    entropy -= p * Math.log(p)
  }
  const maxEntropy = Math.log(n)
  const agreement = maxEntropy === 0 ? 1 : 1 - entropy / maxEntropy
  return Math.round(Math.max(0, Math.min(1, agreement)) * 100)
}
