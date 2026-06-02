# Contexte — Écran principal Stage 1 (UI streaming)

État : implémenté, non commité. typecheck + lint + build verts.

- `src/components/council/CouncilStage.tsx` : écran principal. Composer héroïque
  (idle) → question épinglée + assemblée (running/done/error), transition AnimatePresence.
- `useCouncil` (`src/hooks/`) : orchestre le flux SSE. Streaming lissé 60fps via
  tampons hors-React drainés par requestAnimationFrame (effet typewriter, statut
  final appliqué tampon vidé). Rendu optimiste immédiat des 4 cartes.
- `council-client.ts` : client SSE réel (Bearer + apikey vers Edge Function) +
  mock auto si Supabase non configuré (un modèle lent, un en échec) → démontrable
  sans backend. Forçable par `VITE_COUNCIL_MOCK=true`.
- `ModelCard` : carte verre, état gracieux (pending/streaming/error/timeout),
  scroll interne, hauteur fixe (zéro layout shift), teinte subtile par slot.
- `CouncilAssembly` : grille 4 col (≥sm) / onglets accessibles (<640px).
- prefers-reduced-motion respecté partout. eslint ignore `supabase/functions` (Deno).
- TODO : brancher Stage 2/3 (verdict UI), déployer l'Edge Function pour flux réel.
