-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0016 — Compte & rétention (conversion, limites freemium, presets)
-- ════════════════════════════════════════════════════════════════════════
-- Cette migration outille la couche qui « rend coûteux de partir » :
--   • conversion anonyme→compte : flip automatique de profiles.is_anonymous
--     quand un email/identité est rattaché (le même auth.uid() est conservé,
--     donc tous les runs/collections/councils restent attachés sans migration).
--   • garde-fous freemium côté serveur (en plus de l'UI) : plafonds de
--     collections et de councils selon le statut FREE/PRO.
--   • presets de councils « à caractère » : assemblées nommées, partagées par
--     tous (lecture seule), point de départ pour composer le sien.
-- ════════════════════════════════════════════════════════════════════════

-- ─── is_user_pro(uid) ────────────────────────────────────────────────────
-- Helper centralisé : true si le profil a un PRO actif (non expiré).
create or replace function public.is_user_pro(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_pro and (pro_expires_at is null or pro_expires_at > now())
     from public.profiles where id = p_uid),
    false
  );
$$;

comment on function public.is_user_pro(uuid) is
  'true si le profil possède un PRO actif (is_pro et non expiré).';

-- ─── Conversion anonyme → compte ─────────────────────────────────────────
-- Déclenché quand auth.users change (rattachement email/OAuth). Si l'identité
-- n'est plus anonyme (email confirmé OU is_anonymous repassé à false), on
-- bascule profiles.is_anonymous. On déplafonne aussi l'historique : les runs
-- gratuits du compte voient leur expiration levée à la conversion (geste de
-- bienvenue cohérent avec « l'historique de la session ne se perd pas »).
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_permanent boolean;
begin
  v_now_permanent := (coalesce(new.is_anonymous, false) = false)
                     and (new.email is not null);

  -- Rien à faire si l'état d'anonymat n'a pas évolué.
  if v_now_permanent then
    update public.profiles
       set is_anonymous = false,
           display_name = coalesce(
             display_name,
             nullif(new.raw_user_meta_data ->> 'display_name', ''),
             nullif(new.raw_user_meta_data ->> 'full_name', ''),
             nullif(new.raw_user_meta_data ->> 'name', '')
           ),
           avatar_url = coalesce(
             avatar_url,
             nullif(new.raw_user_meta_data ->> 'avatar_url', '')
           )
     where id = new.id and is_anonymous = true;
  end if;

  return new;
end;
$$;

comment on function public.handle_user_updated() is
  'AFTER UPDATE auth.users : bascule profiles.is_anonymous à la conversion et reporte display_name/avatar.';

drop trigger if exists trg_on_auth_user_updated on auth.users;
create trigger trg_on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

-- ─── Plafond de collections (freemium) ───────────────────────────────────
-- FREE : 2 collections. PRO : illimité. Vérifié AVANT insertion. Les presets
-- système n'ont pas de propriétaire et ne sont pas concernés.
create or replace function public.enforce_collection_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if public.is_user_pro(new.owner_id) then
    return new;                                   -- PRO : aucune limite.
  end if;

  select count(*) into v_count
  from public.collections
  where owner_id = new.owner_id;

  if v_count >= 2 then
    raise exception 'free_collection_limit'
      using hint = 'Le plan gratuit autorise 2 collections. Passe en PRO pour un nombre illimité.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_collection_limit() is
  'BEFORE INSERT collections : plafonne à 2 pour les comptes FREE (illimité en PRO).';

create trigger trg_collections_enforce_limit
  before insert on public.collections
  for each row execute function public.enforce_collection_limit();

-- ─── Plafond de councils personnalisés (freemium) ────────────────────────
-- FREE : 1 council perso. PRO : 10. (Les presets système sont exclus : pas de
-- owner_id.) Vérifié AVANT insertion.
create or replace function public.enforce_council_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_limit int;
begin
  if new.owner_id is null then
    return new;                                   -- preset système.
  end if;

  v_limit := case when public.is_user_pro(new.owner_id) then 10 else 1 end;

  select count(*) into v_count
  from public.councils
  where owner_id = new.owner_id;

  if v_count >= v_limit then
    raise exception 'free_council_limit'
      using hint = 'Plan gratuit : 1 council perso. PRO : jusqu''à 10.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_council_limit() is
  'BEFORE INSERT councils : plafonne à 1 (FREE) / 10 (PRO) les councils détenus.';

create trigger trg_councils_enforce_limit
  before insert on public.councils
  for each row execute function public.enforce_council_limit();

-- ─── Presets de councils « à caractère » ─────────────────────────────────
-- Assemblées nommées avec une intention claire, visibles de tous (RLS
-- councils_select_own_or_preset). Elles servent de points de départ : un
-- utilisateur peut les convoquer telles quelles ou les dupliquer pour composer
-- la sienne. Uniquement des modèles :free → utilisables dès le mode démo.
insert into public.councils (id, owner_id, name, description, delegates, chairman_model, is_preset, is_default)
values
  (
    '00000000-0000-0000-0000-0000000c0de2',
    null,
    'Les Sceptiques',
    'Une assemblée qui doute, recoupe et exige des preuves. Pour les questions factuelles et les affirmations à vérifier.',
    '[
      {"slot":"A","model_id":"meta-llama/llama-3.3-70b-instruct:free","label":"Llama 3.3 70B"},
      {"slot":"B","model_id":"qwen/qwen3-235b-a22b:free","label":"Qwen3 235B"},
      {"slot":"C","model_id":"google/gemma-2-9b-it:free","label":"Gemma 2 9B"},
      {"slot":"D","model_id":"mistralai/mistral-7b-instruct:free","label":"Mistral 7B"}
    ]'::jsonb,
    'qwen/qwen3-235b-a22b:free',
    true,
    false
  ),
  (
    '00000000-0000-0000-0000-0000000c0de3',
    null,
    'Le Comité Créatif',
    'Quatre voix pour explorer, imaginer et diverger. Pour le brainstorming, la fiction et les idées à contre-courant.',
    '[
      {"slot":"A","model_id":"mistralai/mistral-7b-instruct:free","label":"Mistral 7B"},
      {"slot":"B","model_id":"meta-llama/llama-3.3-70b-instruct:free","label":"Llama 3.3 70B"},
      {"slot":"C","model_id":"qwen/qwen3-235b-a22b:free","label":"Qwen3 235B"},
      {"slot":"D","model_id":"google/gemma-2-9b-it:free","label":"Gemma 2 9B"}
    ]'::jsonb,
    'meta-llama/llama-3.3-70b-instruct:free',
    true,
    false
  ),
  (
    '00000000-0000-0000-0000-0000000c0de4',
    null,
    'Le Tribunal',
    'Une délibération posée, méthodique, qui pèse le pour et le contre. Pour les dilemmes éthiques et les décisions difficiles.',
    '[
      {"slot":"A","model_id":"qwen/qwen3-235b-a22b:free","label":"Qwen3 235B"},
      {"slot":"B","model_id":"google/gemma-2-9b-it:free","label":"Gemma 2 9B"},
      {"slot":"C","model_id":"meta-llama/llama-3.3-70b-instruct:free","label":"Llama 3.3 70B"},
      {"slot":"D","model_id":"mistralai/mistral-7b-instruct:free","label":"Mistral 7B"}
    ]'::jsonb,
    'meta-llama/llama-3.3-70b-instruct:free',
    true,
    false
  )
on conflict (id) do nothing;
