# Contexte — Générateur automatique de Questions du Jour

État : implémenté, non commité. `deno check` + `deno lint` verts ; pnpm typecheck + lint + build verts. Non déployé.

- **Edge Function** `supabase/functions/generate-daily-questions/` : protégée par `CRON_SECRET` (header Authorization, `verify_jwt=false` dans `config.toml`). Calcule les 7 dates de la semaine suivante (lundi→dimanche, UTC), génère via OpenRouter (chairman par défaut, temp 1.0) un JSON strict `{question, theme, expected_divergence}`, valide (50–200 car), déduplique sur 30 j (Jaccard ≥ 0.5), complète par la banque `fallback.ts` (30 questions) si < 7. Insère `questions` + `daily_question` (`published=false`, `scheduled_for=day`, council démo). Dégradation gracieuse : panne OpenRouter → fallback, jamais de jour vide.
- **Migration 0018** : `pg_net` ; colonnes `scheduled_for` (date) + `theme` (text) sur `daily_question` (+ backfill) ; cron dimanche 18h UTC → `net.http_post` vers la fonction (URL + secret lus depuis **Vault**) ; cron quotidien 8h UTC → publie les QdJ dont `scheduled_for = current_date + 1`.
- **Secrets** : `CRON_SECRET` ajouté à `.env.example`. À déclarer côté Edge (`supabase secrets set`) ET côté base (`vault.create_secret` pour `cron_secret` + `project_url`).
- **À faire** : `supabase functions deploy generate-daily-questions`, `supabase db push` (0018), poser les secrets Vault, déclarer `CRON_SECRET`. Tester un run manuel via `net.http_post` ou `supabase functions invoke`.
