/**
 * Tests unitaires du cœur Stage 2/3 (`_shared/ranking.ts`).
 *
 * Couvre la robustesse du parsing « FINAL RANKING: » (bloc exact + fallbacks
 * FR/EN), l'agrégation Borda et le score de consensus objectif.
 *
 * Lancer : `deno test supabase/functions/_tests/` (depuis supabase/functions).
 */

import { assertEquals, assert } from '@std/assert'
import {
  aggregateBorda,
  computeConsensus,
  parseFinalRanking,
} from '../_shared/ranking.ts'

// ════════════════════════════════════════════════════════════════════════
// parseFinalRanking — bloc exact « FINAL RANKING: »
// ════════════════════════════════════════════════════════════════════════

Deno.test('parse: bloc FINAL RANKING exact, étiquettes « Réponse X »', () => {
  const raw = `Mon analyse des trois réponses...

FINAL RANKING:
1. Réponse B — la plus rigoureuse
2. Réponse A — correcte mais incomplète
3. Réponse C — hors-sujet`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['B', 'A', 'C'])
})

Deno.test('parse: en-tête français « CLASSEMENT FINAL: » + « Modèle X »', () => {
  const raw = `CLASSEMENT FINAL:
1. Modèle C
2. Modèle A
3. Modèle B`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['C', 'A', 'B'])
})

Deno.test('parse: ignore le préambule, ne prend que le bloc après l\'en-tête', () => {
  // Des lettres apparaissent avant l'en-tête : elles ne doivent pas polluer.
  const raw = `Je pense que la réponse A est intéressante et la B aussi.

FINAL RANKING:
1. Réponse A
2. Réponse B
3. Réponse C`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['A', 'B', 'C'])
})

// ════════════════════════════════════════════════════════════════════════
// parseFinalRanking — fallbacks (pas d'en-tête / formats variés)
// ════════════════════════════════════════════════════════════════════════

Deno.test('fallback: liste numérotée sans en-tête', () => {
  const raw = `1. Réponse A\n2. Réponse C\n3. Réponse B`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['A', 'C', 'B'])
})

Deno.test('fallback: parenthèses « 1) » et mot « Model »', () => {
  const raw = `1) Model B\n2) Model A\n3) Model C`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['B', 'A', 'C'])
})

Deno.test('fallback: ordinaux anglais « 1st/2nd/3rd » lettres nues', () => {
  const raw = `1st: B\n2nd: A\n3rd: C`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['B', 'A', 'C'])
})

Deno.test('fallback: ordinaux français « Premier/Deuxième/Troisième »', () => {
  const raw = `Premier : Réponse C\nDeuxième : Réponse A\nTroisième : Réponse B`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['C', 'A', 'B'])
})

Deno.test('fallback: bloc présent mais incomplet → re-scan du texte entier', () => {
  // L'en-tête existe mais le bloc en dessous est partiel ; les positions
  // complètes se trouvent plus haut dans le texte.
  const raw = `1. Réponse A\n2. Réponse B\n3. Réponse C\n\nFINAL RANKING:\n1. Réponse A`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assert(r.ok)
  assertEquals(r.order, ['A', 'B', 'C'])
})

// ════════════════════════════════════════════════════════════════════════
// parseFinalRanking — entrées invalides → parse_ok=false (vote ignoré)
// ════════════════════════════════════════════════════════════════════════

Deno.test('invalide: classement incomplet (2 sur 3)', () => {
  const raw = `FINAL RANKING:\n1. Réponse A\n2. Réponse B`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assertEquals(r.ok, false)
  assertEquals(r.order, [])
})

Deno.test('invalide: doublon d\'étiquette', () => {
  const raw = `FINAL RANKING:\n1. Réponse A\n2. Réponse A\n3. Réponse B`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assertEquals(r.ok, false)
})

Deno.test('invalide: aucun classement détectable', () => {
  const raw = `Je ne suis pas en mesure de classer ces réponses objectivement.`
  const r = parseFinalRanking(raw, ['A', 'B', 'C'])
  assertEquals(r.ok, false)
  assertEquals(r.order, [])
})

Deno.test('invalide: étiquette hors périmètre attendu', () => {
  // Le reviewer ne voit que A/B (2 autres réponses) mais cite un D inexistant.
  const raw = `FINAL RANKING:\n1. Réponse D\n2. Réponse A`
  const r = parseFinalRanking(raw, ['A', 'B'])
  assertEquals(r.ok, false)
})

Deno.test('parse: cas à 2 étiquettes (council dégradé à 3/4)', () => {
  const raw = `FINAL RANKING:\n1. Réponse B\n2. Réponse A`
  const r = parseFinalRanking(raw, ['A', 'B'])
  assert(r.ok)
  assertEquals(r.order, ['B', 'A'])
})

// ════════════════════════════════════════════════════════════════════════
// aggregateBorda
// ════════════════════════════════════════════════════════════════════════

Deno.test('borda: somme des points (1er=3, 2e=2, 3e=1)', () => {
  const ballots = [
    { ranked: ['A', 'B', 'C'] },
    { ranked: ['B', 'A', 'C'] },
  ]
  const scores = aggregateBorda(ballots, ['A', 'B', 'C', 'D'])
  assertEquals(scores, { A: 5, B: 5, C: 2, D: 0 })
})

Deno.test('borda: slot jamais classé reste à 0', () => {
  const scores = aggregateBorda([{ ranked: ['A', 'B'] }], ['A', 'B', 'C'])
  assertEquals(scores.C, 0)
})

Deno.test('borda: au-delà du barème (4e place) → 0 pt', () => {
  const scores = aggregateBorda([{ ranked: ['W', 'X', 'Y', 'Z'] }], ['W', 'X', 'Y', 'Z'])
  assertEquals(scores, { W: 3, X: 2, Y: 1, Z: 0 })
})

Deno.test('borda: aucun bulletin valide → tous à 0', () => {
  const scores = aggregateBorda([], ['A', 'B', 'C'])
  assertEquals(scores, { A: 0, B: 0, C: 0 })
})

// ════════════════════════════════════════════════════════════════════════
// computeConsensus
// ════════════════════════════════════════════════════════════════════════

Deno.test('consensus: gagnant net (accord total) → proche de 100', () => {
  const score = computeConsensus({ A: 9, B: 0, C: 0 })
  assertEquals(score, 100)
})

Deno.test('consensus: répartition uniforme (désaccord) → proche de 0', () => {
  const score = computeConsensus({ A: 3, B: 3, C: 3 })
  assertEquals(score, 0)
})

Deno.test('consensus: accord partiel → strictement entre 0 et 100', () => {
  const score = computeConsensus({ A: 6, B: 3, C: 0 })
  assert(score > 0 && score < 100)
})

Deno.test('consensus: pas de données exploitables → neutre 50', () => {
  assertEquals(computeConsensus({}), 50)
  assertEquals(computeConsensus({ A: 0, B: 0 }), 50)
})

Deno.test('consensus: toujours borné dans [0, 100]', () => {
  const cases: Record<string, number>[] = [{ A: 7, B: 2, C: 1 }, { A: 1, B: 1 }, { A: 10 }]
  for (const scores of cases) {
    const s = computeConsensus(scores)
    assert(s >= 0 && s <= 100, `hors bornes: ${s}`)
  }
})
