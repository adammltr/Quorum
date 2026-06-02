# Contexte — Expérience first-run (< 60 s, sans inscription)

État : implémenté, non commité. typecheck + lint + build verts.

- Zéro écran vide : `QuestionComposer` pré-remplit une question (rotation via
  `lib/seed-questions.ts` — 6 dilemmes à arbitrages où les modèles divergent).
  Variante hero : rangée de suggestions cliquables (« Ou explorez : ») + 1 clic.
- Micro-onboarding 1 ligne : « 4 IA répondent, s'évaluent en aveugle, puis
  tranchent. » + `TrustBadges` (Gratuit · Sans inscription · Clés privées · Open
  source). Session anonyme déjà gérée (`ensureSession`), aucune inscription requise.
- `SaveResultPrompt` : proposé UNIQUEMENT après le 1er verdict (soft paywall,
  non intrusif, fermable). CTA = intention (analytics `signup_intent`) ; auth
  pas encore branchée → message honnête (session gardée 7 jours).
- Dégradation élégante : `ModelCard` affiche un skeleton premium (shimmer,
  `.skeleton-line`) en attente, + message rassurant si 1er token > 6 s. Jamais
  de spinner global.
- Analytics (`lib/analytics.ts`, PostHog si dispo, sinon console en dev) :
  `council_started`, `time_to_first_verdict` (durée perçue), `signup_intent`.
- TODO : brancher l'auth réelle sur le CTA de sauvegarde.
