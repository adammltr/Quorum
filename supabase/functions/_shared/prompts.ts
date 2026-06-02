/**
 * Construction des prompts des 3 stages.
 *
 * Les prompts imposent des EN-TÊTES STRICTS exploités par le parsing :
 *   • Stage 2 : « FINAL RANKING: » (cf. ranking.ts).
 *   • Stage 3 : « VERDICT: » / « CONSENSUS_SCORE: » / « DISAGREEMENTS: ».
 * Toute la langue est en français (produit francophone).
 */

import { INPUT_LIMITS } from './models.ts'

/** Message au format chat OpenAI/OpenRouter. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Tronque proprement une réponse injectée dans un prompt aval. */
function clip(text: string): string {
  const max = INPUT_LIMITS.responseCharsForReview
  return text.length > max ? text.slice(0, max) + '\n[…tronqué…]' : text
}

// ─── Stage 1 — réponse parallèle ───────────────────────────────────────────
export function buildStage1(question: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        "Tu es un délégué d'une assemblée délibérative. Réponds à la question de " +
        "l'utilisateur de façon rigoureuse, structurée et honnête. Expose ton " +
        "raisonnement clé, reconnais les incertitudes. Sois complet mais concis.",
    },
    { role: 'user', content: question },
  ]
}

// ─── Stage 2 — peer-review aveugle ─────────────────────────────────────────
/**
 * `others` : réponses des AUTRES délégués, DÉJÀ anonymisées et mélangées.
 * Chaque entrée porte une étiquette (« A », « B », …) indépendante du slot réel.
 */
export function buildStage2(
  question: string,
  others: { anonLabel: string; content: string }[],
): ChatMessage[] {
  const block = others
    .map((o) => `### Réponse ${o.anonLabel}\n${clip(o.content)}`)
    .join('\n\n')

  const labels = others.map((o) => o.anonLabel)
  const example = labels
    .map((l, i) => `${i + 1}. Réponse ${l} — [raison courte]`)
    .join('\n')

  return [
    {
      role: 'system',
      content:
        "Tu es un évaluateur impartial. On te présente plusieurs réponses ANONYMES " +
        "à une même question. Évalue-les sur l'exactitude, la profondeur, la clarté " +
        "et l'honnêteté intellectuelle, puis classe-les de la meilleure à la moins " +
        "bonne. Tu ne connais pas les auteurs ; ne spécule pas dessus.",
    },
    {
      role: 'user',
      content:
        `Question posée à l'assemblée :\n${question}\n\n` +
        `Réponses à évaluer :\n\n${block}\n\n` +
        `Classe TOUTES les réponses, de la meilleure à la moins bonne. ` +
        `Termine IMPÉRATIVEMENT par un bloc au format EXACT suivant ` +
        `(une ligne par réponse, étiquette en lettre) :\n\n` +
        `FINAL RANKING:\n${example}`,
    },
  ]
}

// ─── Stage 3 — synthèse Chairman ───────────────────────────────────────────
/**
 * `answers` : réponses des délégués (par slot réel) ; `bordaScores` : agrégat
 * des votes Stage 2. Le Chairman synthétise, score le consensus et EXPOSE les
 * désaccords (signal de valeur, jamais masqué).
 */
export function buildStage3Chairman(
  question: string,
  answers: { slot: string; label: string; content: string }[],
  bordaScores: Record<string, number>,
): ChatMessage[] {
  const block = answers
    .map((a) => `### Délégué ${a.slot} (${a.label})\n${clip(a.content)}`)
    .join('\n\n')

  const scores = Object.entries(bordaScores)
    .map(([slot, pts]) => `Délégué ${slot} : ${pts} pts`)
    .join(' · ')

  return [
    {
      role: 'system',
      content:
        "Tu es le Président (Chairman) d'une assemblée délibérative. À partir des " +
        "réponses des délégués et de leur évaluation croisée, tu rends un verdict " +
        "de consensus : une synthèse éditoriale honnête des convergences, un score " +
        "de consensus chiffré, et une liste explicite des désaccords. Les désaccords " +
        "sont un SIGNAL DE VALEUR : ne les masque jamais.",
    },
    {
      role: 'user',
      content:
        `Question originale :\n${question}\n\n` +
        `Réponses des délégués :\n\n${block}\n\n` +
        `Scores agrégés (vote croisé Borda) : ${scores || 'indisponibles'}\n\n` +
        `Rends ton verdict au format EXACT suivant, en respectant les en-têtes :\n\n` +
        `VERDICT:\n[2 à 4 paragraphes de synthèse]\n\n` +
        `CONSENSUS_SCORE:\n[un entier de 0 à 100 reflétant le degré d'accord entre délégués]\n\n` +
        `DISAGREEMENTS:\n- [point de désaccord 1]\n- [point de désaccord 2]\n` +
        `(écris « - Aucun désaccord significatif » s'il n'y en a pas)`,
    },
  ]
}

// ─── Parsing de la sortie Chairman ─────────────────────────────────────────
export interface ParsedVerdict {
  body: string
  consensusScore: number | null
  disagreements: string[]
}

/** Découpe la sortie Chairman selon ses en-têtes stricts. */
export function parseChairmanOutput(raw: string): ParsedVerdict {
  const section = (name: string): string => {
    const re = new RegExp(`${name}\\s*:?\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:VERDICT|CONSENSUS_SCORE|DISAGREEMENTS)\\s*:|$)`, 'i')
    return raw.match(re)?.[1]?.trim() ?? ''
  }

  const body = section('VERDICT') || raw.trim()

  const scoreRaw = section('CONSENSUS_SCORE')
  const scoreMatch = scoreRaw.match(/\d{1,3}/)
  let consensusScore: number | null = null
  if (scoreMatch) {
    const n = Number(scoreMatch[0])
    if (n >= 0 && n <= 100) consensusScore = n
  }

  const disBlock = section('DISAGREEMENTS')
  const disagreements = disBlock
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((l) => l.length > 0 && !/^aucun désaccord/i.test(l))

  return { body, consensusScore, disagreements }
}
