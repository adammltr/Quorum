-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0015 — RPC de partage (création + métadonnées SSR/OG)
-- ════════════════════════════════════════════════════════════════════════
-- Complète 0009 (table shares) et 0012 (get_shared_run, lecture humaine qui
-- incrémente view_count). Ici :
--   • create_share(run_id)   — crée (ou réutilise) un partage public. Marche
--     pour les comptes anonymes/FREE (le partage est gratuit et illimité).
--   • get_share_meta(slug)   — métadonnées légères SANS incrément, pour le SSR
--     des balises OG et l'image OG dynamique (évite de gonfler view_count avec
--     les hits de crawlers / générateur d'image).
-- ════════════════════════════════════════════════════════════════════════

-- Un seul partage ACTIF par run → idempotence du bouton « Partager ».
create unique index if not exists shares_run_active_idx
  on public.shares (run_id) where is_active;

-- ─── create_share(run_id) → slug ─────────────────────────────────────────
-- SECURITY DEFINER : contourne la RLS mais vérifie explicitement que le run
-- appartient à l'appelant (auth.uid() est non nul même en session anonyme).
create or replace function public.create_share(p_run_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_slug  text;
begin
  if auth.uid() is null then
    raise exception 'session requise' using errcode = '42501';
  end if;

  -- Le run doit appartenir à l'appelant.
  select user_id into v_owner from public.runs where id = p_run_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'run introuvable ou non autorisé' using errcode = '42501';
  end if;

  -- Idempotence : renvoyer le partage actif existant s'il y en a déjà un.
  select slug into v_slug
  from public.shares
  where run_id = p_run_id and is_active
  limit 1;
  if v_slug is not null then
    return v_slug;
  end if;

  insert into public.shares (run_id, owner_id)
  values (p_run_id, auth.uid())
  returning slug into v_slug;

  return v_slug;
end;
$$;

comment on function public.create_share(uuid) is
  'Crée (ou réutilise) le partage public d''un run possédé par l''appelant. Renvoie le slug. Gratuit et illimité (FREE/anonyme inclus).';

-- ─── get_share_meta(slug) → jsonb ────────────────────────────────────────
-- Métadonnées publiques minimales d'un partage actif, SANS incrément de vue.
-- Sert au SSR (balises OG/title/description) et à l'image OG dynamique.
create or replace function public.get_share_meta(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'slug', s.slug,
    'question', q.body,
    'status', r.status,
    'created_at', r.created_at,
    'consensus_score', v.consensus_score,
    'borda_scores', coalesce(v.borda_scores, '{}'::jsonb),
    'models', coalesce((
      select jsonb_agg(
        jsonb_build_object('slot', mr.slot, 'model_id', mr.model_id, 'status', mr.status)
        order by mr.slot
      )
      from public.model_responses mr where mr.run_id = r.id
    ), '[]'::jsonb)
  )
  from public.shares s
  join public.runs r       on r.id = s.run_id
  join public.questions q  on q.id = r.question_id
  left join public.verdicts v on v.run_id = r.id
  where s.slug = p_slug and s.is_active;
$$;

comment on function public.get_share_meta(text) is
  'Métadonnées publiques légères d''un partage actif (question, score, modèles) sans incrément de vue. Pour SSR + image OG.';

-- Exposition : create_share réservé aux sessions (authenticated, anon inclus) ;
-- get_share_meta lisible publiquement (rôle anon des fonctions serverless).
grant execute on function public.create_share(uuid)   to authenticated;
grant execute on function public.get_share_meta(text)  to anon, authenticated;
