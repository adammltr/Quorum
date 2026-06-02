/**
 * Client OpenRouter (chat completions) en STREAMING, tolérant aux pannes.
 *
 *   • Timeout par appel (AbortController), combiné à un éventuel signal externe.
 *   • Retry backoff exponentiel sur erreurs TRANSITOIRES (429 / 5xx) UNIQUEMENT
 *     tant qu'aucun token n'a encore été produit (sinon on dupliquerait la sortie).
 *   • Parsing incrémental du flux SSE OpenRouter (`data: {json}` / `[DONE]`).
 *
 * La clé API n'est JAMAIS journalisée (ni en cas d'erreur).
 */

import {
  OPENROUTER_REFERER,
  OPENROUTER_TITLE,
  OPENROUTER_URL,
  RETRY,
  TIMEOUT_MS,
} from './models.ts'
import { CouncilError } from './errors.ts'
import type { ChatMessage } from './prompts.ts'

export interface ChatCompletionOptions {
  apiKey: string
  model: string
  messages: ChatMessage[]
  /** Signal externe (annulation globale du run). */
  signal?: AbortSignal
  temperature?: number
}

export interface ChatCompletionResult {
  content: string
  tokensIn: number | null
  tokensOut: number | null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Combine le timeout interne avec un signal externe éventuel. */
function buildSignal(external?: AbortSignal): { signal: AbortSignal; cancel: () => void } {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  if (!external) return { signal: timeout, cancel: () => {} }
  // AbortSignal.any : annulation si l'un OU l'autre se déclenche.
  return { signal: AbortSignal.any([timeout, external]), cancel: () => {} }
}

/**
 * Lance une complétion en streaming. Appelle `onDelta` à chaque fragment de
 * texte. Retourne le texte complet accumulé + l'usage (si fourni par l'upstream).
 */
export async function streamChatCompletion(
  opts: ChatCompletionOptions,
  onDelta?: (delta: string) => void,
): Promise<ChatCompletionResult> {
  let lastError: unknown

  for (let attempt = 1; attempt <= RETRY.maxAttempts; attempt++) {
    const { signal } = buildSignal(opts.signal)
    let produced = false

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_REFERER,
          'X-Title': OPENROUTER_TITLE,
        },
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          stream: true,
          temperature: opts.temperature ?? 0.7,
        }),
        signal,
      })

      if (!res.ok || !res.body) {
        const transient = res.status === 429 || res.status >= 500
        // Vide le corps pour libérer la connexion (sans le logguer).
        await res.body?.cancel().catch(() => {})
        if (transient && attempt < RETRY.maxAttempts) {
          await sleep(RETRY.baseDelayMs * 2 ** (attempt - 1))
          continue
        }
        throw new CouncilError('upstream_error', `Modèle indisponible (HTTP ${res.status}).`)
      }

      const result = await consumeStream(res.body, (delta) => {
        produced = true
        onDelta?.(delta)
      })
      return result
    } catch (err) {
      lastError = err
      // Déjà des tokens émis → on ne retente pas (risque de doublon).
      if (produced) break
      // Annulation/timeout : on n'insiste pas.
      if (err instanceof DOMException && err.name === 'AbortError') break
      if (err instanceof CouncilError && err.code !== 'upstream_error') break
      if (attempt < RETRY.maxAttempts) {
        await sleep(RETRY.baseDelayMs * 2 ** (attempt - 1))
        continue
      }
    }
  }

  if (lastError instanceof CouncilError) throw lastError
  if (lastError instanceof DOMException && lastError.name === 'AbortError') {
    throw new CouncilError('upstream_error', 'Le modèle a dépassé le délai imparti.')
  }
  throw new CouncilError('upstream_error', 'Échec de la requête au modèle.')
}

/** Parse incrémentalement le flux SSE OpenRouter et accumule le contenu. */
async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void,
): Promise<ChatCompletionResult> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let tokensIn: number | null = null
  let tokensOut: number | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Découpe par lignes ; conserve la dernière ligne partielle dans le buffer.
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const delta: string = json.choices?.[0]?.delta?.content ?? ''
          if (delta) {
            content += delta
            onDelta(delta)
          }
          if (json.usage) {
            tokensIn = json.usage.prompt_tokens ?? tokensIn
            tokensOut = json.usage.completion_tokens ?? tokensOut
          }
        } catch {
          // Ligne JSON partielle ou commentaire keep-alive : on ignore.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { content, tokensIn, tokensOut }
}
