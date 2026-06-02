# Contexte — Schéma Supabase

État : migrations + client typé livrés, non commités. Pas encore poussé sur un projet Supabase.

- Migrations versionnées dans `supabase/migrations/` (0001→0013) : extensions/helpers, profiles+secrets, questions, councils, runs, stage_results (responses/reviews/verdicts), collections, daily_question, shares, usage, RLS, RPC publiques, seed.
- Stratégie anonyme→compte : **Anonymous Auth** Supabase. `runs.user_id` NOT NULL ; conversion garde l'UUID → zéro migration. Trigger `handle_new_user` crée le profil.
- RLS stricte owner-only partout ; lecture publique sur `shares` (actifs) + `daily_question` (publiées) ; bundles publics via RPC SECURITY DEFINER `get_shared_run` / `get_daily_question`. `user_secrets` = service_role only.
- Freemium : `daily_usage` + RPC `increment_question_usage` (5 anon / 10 compte / ∞ pro) ; `runs.expires_at` +7 j (purge pg_cron).
- Front : `src/lib/supabase.ts` (clé anon + `ensureSession`), `src/lib/database.types.ts` (à régénérer via `supabase gen types` post-déploiement).
- TODO : lier un projet Supabase, `supabase db push`, régénérer les types réels.
