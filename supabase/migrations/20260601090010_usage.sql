-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0010 — Compteurs d'usage freemium
-- ════════════════════════════════════════════════════════════════════════

-- ─── daily_usage ─────────────────────────────────────────────────────────
-- Compteur de questions par utilisateur et par jour. Sert au quota freemium :
--   • anonyme  : 5 questions / jour
--   • compte   : 10 questions / jour
--   • PRO/BYOK : illimité
create table public.daily_usage (
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null default (now() at time zone 'utc')::date,
  question_count int  not null default 0,

  primary key (user_id, day)
);

comment on table  public.daily_usage is
  'Compteur de questions par (utilisateur, jour) pour le quota freemium.';
comment on column public.daily_usage.question_count is
  'Questions consommées le jour donné. Comparé au quota (5 anon / 10 compte / ∞ PRO).';

-- ─── increment_question_usage ────────────────────────────────────────────
-- Incrémente le compteur du jour pour l'appelant et renvoie l'état du quota.
-- SECURITY DEFINER + auth.uid() : l'utilisateur ne peut agir que pour lui-même.
-- Retourne { allowed, remaining, limit, count } ; n'incrémente pas si le quota
-- est déjà atteint.
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
begin
  if v_uid is null then
    raise exception 'auth required';
  end if;

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
    v_limit := 5;                      -- anonyme.
  else
    v_limit := 10;                     -- compte gratuit.
  end if;

  -- Compteur courant (0 si pas encore de ligne aujourd'hui).
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

comment on function public.increment_question_usage() is
  'Incrémente le quota du jour pour auth.uid() et renvoie l''état (allowed/remaining/limit/count).';
