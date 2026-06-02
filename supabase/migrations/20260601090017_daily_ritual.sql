-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0017 — Rituel quotidien (Question du Jour : participation, stats
-- sociales, streaks éthiques, archive consultable)
-- ════════════════════════════════════════════════════════════════════════
-- Complète 0008 (table daily_question) et 0012 (get_daily_question). Ajoute la
-- mécanique de rétention saine :
--   • record_daily_participation — relie un run à la QdJ, recalcule le consensus
--     mondial du jour, met à jour le streak, renvoie la comparaison sociale.
--   • list_daily_questions — archive publique (SEO) des QdJ passées.
--   • daily_streak — compteur de jours consécutifs. ÉTHIQUE : jamais de pénalité,
--     pas de remise à zéro punitive affichée, aucune notification (le rappel
--     reste un opt-in 100% client, .ics). On stocke seulement le compteur.
--   • get_daily_question (recréée) — expose désormais l'id de la QdJ.
-- ════════════════════════════════════════════════════════════════════════

-- ─── daily_streak ──────────────────────────────────────────────────────────
-- Un enregistrement par utilisateur. current_streak = jours consécutifs de
-- participation à la QdJ ; longest_streak = record personnel (jamais effacé).
create table public.daily_streak (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  current_streak int  not null default 0,
  longest_streak int  not null default 0,
  -- Dernier jour (UTC) de participation, base du calcul de continuité.
  last_day       date,
  updated_at     timestamptz not null default now()
);

comment on table  public.daily_streak is
  'Streak de participation à la Question du Jour (éthique : pas de pénalité, juste un compteur).';
comment on column public.daily_streak.current_streak is
  'Jours consécutifs de participation. Repart à 1 après une interruption — jamais affiché comme un échec.';

alter table public.daily_streak enable row level security;

create policy "daily_streak_select_own" on public.daily_streak
  for select to authenticated using (user_id = auth.uid());
-- Écriture exclusivement via record_daily_participation (SECURITY DEFINER).

-- ─── get_daily_question(day) — recréée pour exposer l'id de la QdJ ───────────
create or replace function public.get_daily_question(p_day date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', dq.id,
    'day', dq.day,
    'question', q.body,
    'council_id', dq.council_id,
    'aggregate_consensus', dq.aggregate_consensus,
    'participant_count', dq.participant_count
  )
  into v_result
  from public.daily_question dq
  join public.questions q on q.id = dq.question_id
  where dq.day = p_day and dq.published = true;

  return v_result;
end;
$$;

comment on function public.get_daily_question(date) is
  'Question du Jour publiée pour une date (défaut today) : id, énoncé, council, consensus mondial. NULL si absente/non publiée.';

-- ─── list_daily_questions(limit, offset) — archive publique (SEO) ────────────
-- Liste les QdJ publiées, de la plus récente à la plus ancienne. Données déjà
-- publiques (RLS daily_question_select_published) → exposable à anon.
create or replace function public.list_daily_questions(p_limit int default 60, p_offset int default 0)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(row), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'day', dq.day,
      'question', q.body,
      'aggregate_consensus', dq.aggregate_consensus,
      'participant_count', dq.participant_count
    ) as row
    from public.daily_question dq
    join public.questions q on q.id = dq.question_id
    where dq.published = true and dq.day <= (now() at time zone 'utc')::date
    order by dq.day desc
    limit greatest(1, least(p_limit, 366))
    offset greatest(0, p_offset)
  ) t;
$$;

comment on function public.list_daily_questions(int, int) is
  'Archive publique des Questions du Jour publiées (jour, énoncé, consensus, participants), récentes d''abord. Pour la page archive + SEO.';

-- ─── record_daily_participation(day, run_id) → jsonb ─────────────────────────
-- Relie un run terminé à la QdJ du jour, recalcule le consensus mondial agrégé
-- et le nombre de participants (utilisateurs distincts), met à jour le streak de
-- l'appelant, et renvoie la comparaison sociale légère.
-- SECURITY DEFINER : contourne la RLS mais vérifie que le run appartient bien à
-- l'appelant. Idempotent : ré-appeler le même jour ne gonfle pas les compteurs.
create or replace function public.record_daily_participation(p_run_id uuid, p_day date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_dq_id      uuid;
  v_owner      uuid;
  v_your_score int;
  v_aggregate  int;
  v_participants int;
  v_below      int;   -- participants au consensus <= au tien (percentile doux)
  v_total_scored int;
  v_agree      int;   -- participants ayant atteint un consensus >= 60
  v_percentile int := null;
  v_agree_rate int := null;
  v_last       date;
  v_current    int;
  v_longest    int;
begin
  if v_uid is null then
    raise exception 'session requise' using errcode = '42501';
  end if;

  -- Le run doit appartenir à l'appelant.
  select user_id into v_owner from public.runs where id = p_run_id;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'run introuvable ou non autorisé' using errcode = '42501';
  end if;

  -- QdJ publiée pour ce jour.
  select id into v_dq_id
  from public.daily_question
  where day = p_day and published = true;
  if v_dq_id is null then
    raise exception 'aucune Question du Jour publiée pour %', p_day using errcode = 'P0002';
  end if;

  -- Relie le run à la QdJ (idempotent : ne change rien s'il l'est déjà).
  update public.runs set daily_question_id = v_dq_id
  where id = p_run_id and (daily_question_id is distinct from v_dq_id);

  -- Score de consensus de CE run (NULL si pas de verdict).
  select v.consensus_score into v_your_score
  from public.verdicts v where v.run_id = p_run_id;

  -- Recalcule l'agrégat mondial du jour à partir des verdicts des runs liés.
  select
    round(avg(v.consensus_score))::int,
    count(distinct r.user_id),
    count(*) filter (where v.consensus_score >= 60),
    count(*)
  into v_aggregate, v_participants, v_agree, v_total_scored
  from public.runs r
  join public.verdicts v on v.run_id = r.id
  where r.daily_question_id = v_dq_id;

  update public.daily_question
  set aggregate_consensus = v_aggregate,
      participant_count   = coalesce(v_participants, 0)
  where id = v_dq_id;

  -- Comparaison sociale : percentile doux (part des participants dont le
  -- consensus est ≤ au tien) + taux d'accord (part ayant atteint ≥ 60).
  if v_your_score is not null and coalesce(v_total_scored, 0) > 0 then
    select count(*) into v_below
    from public.runs r
    join public.verdicts v on v.run_id = r.id
    where r.daily_question_id = v_dq_id and v.consensus_score <= v_your_score;
    v_percentile := round((v_below::numeric / v_total_scored) * 100)::int;
  end if;
  if coalesce(v_total_scored, 0) > 0 then
    v_agree_rate := round((v_agree::numeric / v_total_scored) * 100)::int;
  end if;

  -- ── Streak éthique ──────────────────────────────────────────────────────
  select last_day, current_streak, longest_streak
  into v_last, v_current, v_longest
  from public.daily_streak where user_id = v_uid;

  if v_last is null then
    v_current := 1;                       -- première participation
  elsif v_last = p_day then
    v_current := coalesce(v_current, 1);  -- déjà compté aujourd'hui : inchangé
  elsif v_last = p_day - 1 then
    v_current := coalesce(v_current, 0) + 1;  -- jour consécutif
  else
    v_current := 1;                       -- reprise après une pause (sans drame)
  end if;
  v_longest := greatest(coalesce(v_longest, 0), v_current);

  insert into public.daily_streak (user_id, current_streak, longest_streak, last_day, updated_at)
  values (v_uid, v_current, v_longest, p_day, now())
  on conflict (user_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        last_day       = excluded.last_day,
        updated_at     = now();

  return jsonb_build_object(
    'day', p_day,
    'your_score', v_your_score,
    'aggregate_consensus', v_aggregate,
    'participant_count', coalesce(v_participants, 0),
    'percentile', v_percentile,
    'agreement_rate', v_agree_rate,
    'streak', jsonb_build_object('current', v_current, 'longest', v_longest)
  );
end;
$$;

comment on function public.record_daily_participation(uuid, date) is
  'Relie un run à la QdJ, recalcule le consensus mondial + participants, met à jour le streak et renvoie la comparaison sociale. Idempotent par jour.';

-- ─── Exposition ──────────────────────────────────────────────────────────────
grant execute on function public.get_daily_question(date)               to anon, authenticated;
grant execute on function public.list_daily_questions(int, int)         to anon, authenticated;
grant execute on function public.record_daily_participation(uuid, date) to authenticated;

-- ─── Seed : Question du Jour du 2026-06-02 ───────────────────────────────────
-- Idempotent. On crée l'énoncé éditorial (s'il n'existe pas) puis la QdJ publiée
-- pour aujourd'hui, rattachée à l'assemblée démo par défaut.
do $$
declare
  v_qid uuid;
begin
  select id into v_qid from public.questions
  where body = 'Faut-il avoir le droit d''être oublié par les machines ?' and is_editorial
  limit 1;

  if v_qid is null then
    insert into public.questions (author_id, body, is_editorial)
    values (null, 'Faut-il avoir le droit d''être oublié par les machines ?', true)
    returning id into v_qid;
  end if;

  insert into public.daily_question (day, question_id, council_id, published)
  values (
    date '2026-06-02',
    v_qid,
    '00000000-0000-0000-0000-0000000c0de1',  -- assemblée démo (preset par défaut)
    true
  )
  on conflict (day) do nothing;
end;
$$;
