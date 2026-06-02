-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0018 — Générateur automatique de Questions du Jour (cron + Edge Fn)
-- ════════════════════════════════════════════════════════════════════════
-- Outille la planification de la QdJ :
--   • colonnes scheduled_for (date prévue de publication) + theme (catégorie) ;
--   • cron DIMANCHE 18h UTC → appelle l'Edge Function `generate-daily-questions`
--     (net.http_post) qui génère les 7 questions de la semaine suivante en
--     published=false ;
--   • cron QUOTIDIEN 8h UTC → publie les questions prévues pour le lendemain
--     (published=true 24h avant leur date).
--
-- ⚠️  Secrets hors Git : l'URL du projet et le CRON_SECRET sont lus depuis Vault
--     au moment de l'appel (jamais codés en dur ici). À configurer une fois :
--       select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--       select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--     Et déclarer le secret côté Edge Function :
--       supabase secrets set CRON_SECRET=<CRON_SECRET>
-- ════════════════════════════════════════════════════════════════════════

-- pg_net : requêtes HTTP sortantes depuis Postgres (appel de l'Edge Function).
create extension if not exists pg_net with schema extensions;

-- ─── Colonnes de planification ───────────────────────────────────────────────
alter table public.daily_question
  add column if not exists scheduled_for date,
  add column if not exists theme         text;

comment on column public.daily_question.scheduled_for is
  'Date de publication prévue (= day). Clé du cron d''auto-publication 24h avant.';
comment on column public.daily_question.theme is
  'Catégorie éditoriale de la question (éthique, société, technologie…).';

-- Backfill : pour les entrées existantes, la date prévue = la date naturelle.
update public.daily_question
set scheduled_for = day
where scheduled_for is null;

create index if not exists daily_question_scheduled_for_idx
  on public.daily_question (scheduled_for) where published = false;

-- ─── Cron 1 — génération hebdomadaire (dimanche 18h UTC) ─────────────────────
-- Idempotent : on retire un éventuel job homonyme avant de (re)planifier.
do $$
begin
  perform cron.unschedule('quorum_generate_daily_questions')
  where exists (select 1 from cron.job where jobname = 'quorum_generate_daily_questions');
exception when others then
  null; -- pg_cron indisponible (local) : on ignore proprement.
end;
$$;

do $$
begin
  perform cron.schedule(
    'quorum_generate_daily_questions',
    '0 18 * * 0',   -- dimanche 18:00 UTC
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/generate-daily-questions',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' ||
            (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
        ),
        body := '{}'::jsonb,
        -- La génération OpenRouter dépasse le défaut pg_net (5 s) : on laisse la
        -- connexion ouverte le temps que la fonction termine (sinon le fetch est
        -- avorté et la fonction bascule sur la banque de secours).
        timeout_milliseconds := 60000
      );
    $cron$
  );
exception when others then
  null; -- pg_cron/pg_net/Vault indisponibles : on ignore (à configurer en prod).
end;
$$;

-- ─── Cron 2 — auto-publication quotidienne (8h UTC) ──────────────────────────
-- Publie les questions prévues pour LE LENDEMAIN (≈ 24h avant leur date).
do $$
begin
  perform cron.unschedule('quorum_publish_daily_questions')
  where exists (select 1 from cron.job where jobname = 'quorum_publish_daily_questions');
exception when others then
  null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'quorum_publish_daily_questions',
    '0 8 * * *',   -- chaque jour 08:00 UTC
    $cron$
      update public.daily_question
      set published = true
      where scheduled_for = current_date + 1 and published = false;
    $cron$
  );
exception when others then
  null;
end;
$$;
