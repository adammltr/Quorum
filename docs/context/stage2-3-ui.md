# Contexte — Stage 2 & 3 (peer-review + verdict)

État : implémenté, non commité. typecheck + lint + build verts.

- `useCouncil` capture désormais `reviews`, `borda`, `verdict` (body streamé via
  `verdict_token`, drainé par le même rAF que Stage 1). Mock enrichi : votes
  staggered + Borda à tiers nets (A 6 / D 4 / C 2) + verdict streamé + score 71.
- `Stage2Review` : pastilles de votants qui s'activent, classement Borda qui se
  forme et se réordonne (Motion `layout`), sémantique couleur vert/ambre/rouille
  via `slots.ts` (`tierForRank`). Le bas = « point de divergence », pas une erreur.
- `ConsensusRing` : jauge SVG, anneau dessiné + count-up rAF, couleur par palier,
  halo doux. `Stage3Verdict` : verdict Instrument Serif, accent ambre, halo,
  désaccords assumés listés élégamment (climax).
- `StageStepper` : fil narratif Réponses → Évaluation → Verdict (barre qui se
  remplit). `CouncilStage` révèle chaque stage + scroll narratif doux.
- prefers-reduced-motion respecté partout (layout/anim/scroll neutralisés).
- `slots.ts` centralise teintes de slot + sémantique de vote (ModelCard/Assembly
  refactorisés). TODO : brancher sur Edge Function réelle (verdict_token réel).
