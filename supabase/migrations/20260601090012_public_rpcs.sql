-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0012 — RPC publiques (bundles sans fuite)
-- ════════════════════════════════════════════════════════════════════════
-- Les tables de base restent owner-only. Pour exposer un run partagé ou la
-- Question du Jour à des visiteurs non authentifiés, on passe par des
-- fonctions SECURITY DEFINER qui n'assemblent QUE des données déjà publiques
-- (share actif / QdJ publiée). Aucune donnée privée ne fuit.
-- ════════════════════════════════════════════════════════════════════════

-- ─── get_shared_run(slug) ────────────────────────────────────────────────
-- Renvoie le bundle public d'un run partagé : question, réponses (Stage 1),
-- reviews (Stage 2), verdict (Stage 3). Incrémente le compteur de vues.
-- Retourne NULL si le slug est inconnu ou le partage révoqué.
create or replace function public.get_shared_run(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_result jsonb;
begin
  select run_id into v_run_id
  from public.shares
  where slug = p_slug and is_active = true;

  if v_run_id is null then
    return null;
  end if;

  update public.shares set view_count = view_count + 1 where slug = p_slug;

  select jsonb_build_object(
    'run', jsonb_build_object(
      'id', r.id,
      'status', r.status,
      'created_at', r.created_at,
      'council_snapshot', r.council_snapshot
    ),
    'question', q.body,
    'responses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot', mr.slot, 'model_id', mr.model_id,
        'content', mr.content, 'status', mr.status, 'latency_ms', mr.latency_ms
      ) order by mr.slot)
      from public.model_responses mr where mr.run_id = r.id
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reviewer_slot', rv.reviewer_slot, 'ranking', rv.ranking
      ) order by rv.reviewer_slot)
      from public.reviews rv where rv.run_id = r.id and rv.parse_ok
    ), '[]'::jsonb),
    'verdict', (
      select jsonb_build_object(
        'body', v.body, 'consensus_score', v.consensus_score,
        'disagreements', v.disagreements, 'borda_scores', v.borda_scores
      )
      from public.verdicts v where v.run_id = r.id
    )
  )
  into v_result
  from public.runs r
  join public.questions q on q.id = r.question_id
  where r.id = v_run_id;

  return v_result;
end;
$$;

comment on function public.get_shared_run(text) is
  'Bundle public d''un run partagé (slug actif) : question + stages 1/2/3. Incrémente view_count.';

-- ─── get_daily_question(day) ─────────────────────────────────────────────
-- Renvoie la Question du Jour publiée pour une date donnée (défaut : today).
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
  'Question du Jour publiée pour une date (défaut today). NULL si absente/non publiée.';

-- Exposition aux rôles publics (lecture seule, données déjà publiques).
grant execute on function public.get_shared_run(text)        to anon, authenticated;
grant execute on function public.get_daily_question(date)    to anon, authenticated;
grant execute on function public.increment_question_usage()  to authenticated;
