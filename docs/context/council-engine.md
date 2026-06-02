# Contexte — Moteur de consensus (Edge Function `council`)

État : implémenté, non commité, non déployé. Tests verts (22/22), typecheck + lint Deno OK.

- Endpoint SSE `supabase/functions/council/index.ts` orchestre les 3 stages :
  Stage 1 fan-out streaming tolérant aux pannes (timeout/retry, min 2/4) →
  Stage 2 peer-review aveugle anonymisé + agrégation Borda →
  Stage 3 Chairman (verdict + score de consensus + désaccords).
- Cœur pur testable dans `_shared/ranking.ts` (parse FINAL RANKING + fallbacks FR/EN,
  Borda, consensus). Config centralisée `_shared/models.ts`. Prompts, OpenRouter
  streaming, crypto BYOK (AES-GCM), CORS, erreurs typées, rate limit dans `_shared/`.
- Sécurité : clé `:free` serveur jamais exposée ; BYOK déchiffrée à la volée ;
  rate limit IP (migration `0014_rate_limit.sql`, IP hachée) + quota session ;
  persistance service_role (questions/runs/responses/reviews/verdicts).
- Env requis (Edge) : `OPENROUTER_API_KEY`, `BYOK_ENCRYPTION_KEY`, `RATE_LIMIT_SALT`
  (+ `SUPABASE_*` auto). Voir `.env.example`.
- TODO : déployer (`supabase functions deploy council`), pousser migration 0014,
  endpoint d'enregistrement/chiffrement de la clé BYOK, brancher l'UI front (colonnes streaming).
- Tests : `cd supabase/functions && deno test --allow-env _tests/` (Deno requis ;
  ici lancé via `npx deno@2.1.4`).
