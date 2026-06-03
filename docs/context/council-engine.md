# Contexte — Moteur de consensus (Edge Function `council`)

État : implémenté, non commité, non déployé. Tests verts (22/22), typecheck + lint Deno OK.

- Endpoint SSE `supabase/functions/council/index.ts` orchestre les 3 stages :
  Stage 1 fan-out streaming tolérant aux pannes (timeout/retry, min 2/4) →
  Stage 2 peer-review aveugle anonymisé + agrégation Borda →
  Stage 3 Chairman (verdict + score de consensus + désaccords).
- Cœur pur testable dans `_shared/ranking.ts` (parse FINAL RANKING + fallbacks FR/EN,
  Borda, consensus). Config centralisée `_shared/models.ts`. Prompts, OpenRouter
  streaming, crypto BYOK (AES-GCM), CORS, erreurs typées, rate limit dans `_shared/`.
- Mode démo MULTI-PROVIDER gratuit (Cerebras / Groq / Gemini) au lieu d'OpenRouter `:free`
  (trop limité). Routage `model_id → provider` dans `_shared/models.ts`
  (`PROVIDER_CONFIG`, `DEMO_PROVIDER_BY_MODEL`) ; `streamLLMCall(baseUrl?)` cible tout
  endpoint OpenAI-compatible. BYOK inchangé → OpenRouter (baseUrl par défaut).
  Preset démo aligné : seed 0013 + migration `0022_demo_council_multiprovider.sql`.
- Sécurité : clés provider serveur jamais exposées ; BYOK déchiffrée à la volée ;
  rate limit IP (migration `0014_rate_limit.sql`, IP hachée) + quota session ;
  persistance service_role (questions/runs/responses/reviews/verdicts).
- Env requis (Edge) : `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` (mode démo),
  `BYOK_ENCRYPTION_KEY`, `RATE_LIMIT_SALT` (+ `SUPABASE_*` auto). `OPENROUTER_API_KEY`
  n'est plus utilisé serveur (BYOK = clé utilisateur). Voir `.env.example`.
- TODO : déployer (`supabase functions deploy council`), pousser migration 0014,
  endpoint d'enregistrement/chiffrement de la clé BYOK, brancher l'UI front (colonnes streaming).
- Tests : `cd supabase/functions && deno test --allow-env _tests/` (Deno requis ;
  ici lancé via `npx deno@2.1.4`).
