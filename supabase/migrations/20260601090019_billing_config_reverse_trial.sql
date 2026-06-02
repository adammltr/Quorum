-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0019 — Config freemium réglable + reverse-trial
-- ════════════════════════════════════════════════════════════════════════
-- Rend la monétisation open-core ajustable SANS redéploiement de code :
--   • billing_config : singleton tenant les plafonds freemium (questions/jour,
--     durée du reverse-trial). Source d'autorité serveur ; le client en est le
--     miroir (src/config/billing.ts).
--   • increment_question_usage : redéfini pour lire les quotas dans billing_config
--     (au lieu des constantes 5/10 codées en dur).
--   • start_reverse_trial : octroie X jours de PRO à un nouveau compte, une seule
--     fois, jamais ré-accordé (idempotent). Appelé sous feature flag côté client.
-- ════════════════════════════════════════════════════════════════════════

-- ─── billing_config (singleton) ──────────────────────────────────────────
-- Une seule ligne (id = true). Modifier les valeurs ici ajuste l'offre en prod.
create table if not exists public.billing_config (
  id                           boolean primary key default true,
  free_daily_questions_anon    int not null default 5,
  free_daily_questions_account int not null default 10,
  reverse_trial_days           int not null default 7,
  updated_at                   timestamptz not null default now(),
  constraint billing_config_singleton check (id)
);

comment on table public.billing_config is
  'Singleton des plafonds freemium (autorité serveur). Le client en est le miroir.';

insert into public.billing_config (id) values (true)
on conflict (id) do nothing;

-- Lecture seule pour tous (le client peut afficher les quotas réels). Écriture
-- réservée au service_role (aucune policy d'update → bloqué pour anon/auth).
alter table public.billing_config enable row level security;

drop policy if exists billing_config_select_all on public.billing_config;
create policy billing_config_select_all
  on public.billing_config for select
  to anon, authenticated
  using (true);

grant select on public.billing_config to anon, authenticated;

-- ─── increment_question_usage (redéfinie : quotas lus en config) ─────────
-- Identique à 0010, mais les limites anon/compte proviennent de billing_config.
create or replace function public.increment_question_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_today   date := (now() at time zone 'utc')::date;
  v_is_anon boolean;
  v_is_pro  boolean;
  v_limit   int;
  v_count   int;
  v_lim_anon    int;
  v_lim_account int;
begin
  if v_uid is null then
    raise exception 'auth required';
  end if;

  select free_daily_questions_anon, free_daily_questions_account
    into v_lim_anon, v_lim_account
  from public.billing_config where id = true;
  v_lim_anon    := coalesce(v_lim_anon, 5);
  v_lim_account := coalesce(v_lim_account, 10);

  select
    is_anonymous,
    (is_pro and (pro_expires_at is null or pro_expires_at > now()))
  into v_is_anon, v_is_pro
  from public.profiles
  where id = v_uid;

  -- Quota selon le statut.
  if coalesce(v_is_pro, false) then
    v_limit := 2147483647;             -- illimité (PRO/BYOK).
  elsif coalesce(v_is_anon, true) then
    v_limit := v_lim_anon;             -- anonyme.
  else
    v_limit := v_lim_account;          -- compte gratuit.
  end if;

  select coalesce(question_count, 0) into v_count
  from public.daily_usage
  where user_id = v_uid and day = v_today;
  v_count := coalesce(v_count, 0);

  if v_count >= v_limit then
    return jsonb_build_object(
      'allowed', false, 'remaining', 0, 'limit', v_limit, 'count', v_count
    );
  end if;

  insert into public.daily_usage (user_id, day, question_count)
  values (v_uid, v_today, 1)
  on conflict (user_id, day)
  do update set question_count = public.daily_usage.question_count + 1
  returning question_count into v_count;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(v_limit - v_count, 0),
    'limit', v_limit,
    'count', v_count
  );
end;
$$;

-- ─── profiles.trial_started_at ───────────────────────────────────────────
-- Marque l'octroi d'un reverse-trial. NULL = jamais accordé. Sert à garantir
-- qu'un compte ne peut pas réclamer plusieurs trials.
alter table public.profiles
  add column if not exists trial_started_at timestamptz;

comment on column public.profiles.trial_started_at is
  'Date d''octroi du reverse-trial (un seul par identité). NULL = jamais accordé.';

-- ─── start_reverse_trial() ───────────────────────────────────────────────
-- Octroie au compte appelant `reverse_trial_days` jours de PRO, UNE seule fois.
-- Refuse silencieusement (statut explicite) si déjà PRO ou trial déjà consommé.
-- SECURITY DEFINER + auth.uid() : agit uniquement pour l'appelant.
create or replace function public.start_reverse_trial()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_days    int;
  v_is_pro  boolean;
  v_used    timestamptz;
  v_expires timestamptz;
begin
  if v_uid is null then
    raise exception 'auth required';
  end if;

  select reverse_trial_days into v_days from public.billing_config where id = true;
  v_days := coalesce(v_days, 7);

  select
    (is_pro and (pro_expires_at is null or pro_expires_at > now())),
    trial_started_at
  into v_is_pro, v_used
  from public.profiles
  where id = v_uid;

  -- Déjà PRO actif : rien à offrir.
  if coalesce(v_is_pro, false) then
    return jsonb_build_object('status', 'already_pro');
  end if;

  -- Trial déjà consommé : pas de second.
  if v_used is not null then
    return jsonb_build_object('status', 'already_used');
  end if;

  v_expires := now() + make_interval(days => v_days);

  update public.profiles
     set is_pro          = true,
         pro_expires_at   = v_expires,
         trial_started_at = now()
   where id = v_uid;

  return jsonb_build_object('status', 'started', 'expires_at', v_expires);
end;
$$;

comment on function public.start_reverse_trial() is
  'Octroie un reverse-trial PRO (billing_config.reverse_trial_days) une seule fois par identité.';

grant execute on function public.start_reverse_trial() to authenticated;
