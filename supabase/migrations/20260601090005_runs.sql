-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0005 — Runs (exécutions délibératives)
-- ════════════════════════════════════════════════════════════════════════

-- ─── runs ────────────────────────────────────────────────────────────────
-- Une exécution = une question soumise à un council, traversant les 3 stages.
-- user_id est NOT NULL : grâce à l'Anonymous Auth, même un visiteur sans
-- inscription possède un auth.uid() (anonyme). La conversion en compte garde
-- le même id → tous les runs restent rattachés automatiquement.
create table public.runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  question_id     uuid not null references public.questions (id) on delete cascade,
  -- Council d'origine (peut être supprimé ensuite → on garde le snapshot).
  council_id      uuid references public.councils (id) on delete set null,
  -- Composition figée au moment du run (les councils évoluent, pas l'historique).
  council_snapshot jsonb not null,
  -- Lien optionnel vers la Question du Jour à laquelle ce run répond.
  daily_question_id uuid,
  -- Cycle de vie de la délibération.
  status          text not null default 'pending'
                  check (status in ('pending','stage1','stage2','stage3','complete','failed','degraded')),
  -- 'demo' = modèles :free côté serveur ; 'byok' = clé perso de l'utilisateur.
  mode            text not null default 'demo' check (mode in ('demo','byok')),
  error           text,
  -- true dès qu'un share public est généré pour ce run.
  is_public       boolean not null default false,
  -- Freemium : expiration de l'historique gratuit (created_at + 7 j ; NULL si PRO).
  expires_at      timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table  public.runs is
  'Exécution délibérative (question + snapshot council) traversant les 3 stages.';
comment on column public.runs.user_id is
  'Propriétaire (anonyme ou inscrit). NOT NULL grâce à l''Anonymous Auth Supabase.';
comment on column public.runs.council_snapshot is
  'Composition du council figée au lancement (immuable, indépendante des évolutions du council).';
comment on column public.runs.expires_at is
  'Expiration de l''historique gratuit (created_at + 7 j). NULL = conservé (PRO).';

create index runs_user_id_created_idx on public.runs (user_id, created_at desc);
create index runs_daily_question_id_idx on public.runs (daily_question_id);
create index runs_expires_at_idx on public.runs (expires_at) where expires_at is not null;

-- ─── Expiration de l'historique gratuit ──────────────────────────────────
-- À l'insertion : si le propriétaire n'est pas PRO, on pose expires_at à +7 j.
create or replace function public.set_run_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_pro boolean;
begin
  select (is_pro and (pro_expires_at is null or pro_expires_at > now()))
    into v_is_pro
  from public.profiles
  where id = new.user_id;

  if coalesce(v_is_pro, false) then
    new.expires_at := null;            -- PRO : historique illimité.
  else
    new.expires_at := now() + interval '7 days';
  end if;
  return new;
end;
$$;

comment on function public.set_run_expiry() is
  'BEFORE INSERT runs : pose expires_at à +7 j pour les comptes gratuits, NULL pour PRO.';

create trigger trg_runs_set_expiry
  before insert on public.runs
  for each row execute function public.set_run_expiry();

-- Purge quotidienne des runs gratuits expirés (pg_cron, 03:00 UTC).
-- Idempotent : on retire un éventuel job homonyme avant de le (re)planifier.
do $$
begin
  perform cron.unschedule('quorum_purge_expired_runs')
  where exists (select 1 from cron.job where jobname = 'quorum_purge_expired_runs');
exception when others then
  -- pg_cron indisponible (ex. environnement local) : on ignore proprement.
  null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'quorum_purge_expired_runs',
    '0 3 * * *',
    $cron$delete from public.runs where expires_at is not null and expires_at < now();$cron$
  );
exception when others then
  null;
end;
$$;
