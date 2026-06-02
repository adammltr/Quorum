-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0004 — Councils (configs de modèles réutilisables)
-- ════════════════════════════════════════════════════════════════════════

-- ─── councils ────────────────────────────────────────────────────────────
-- Un council = la composition de l'assemblée : 4 modèles délégués (Stage 1/2)
-- + 1 modèle Chairman (Stage 3). owner_id NULL = preset système partagé par
-- tous (lecture seule). FREE : 1 council. PRO : jusqu'à 10.
create table public.councils (
  id            uuid primary key default gen_random_uuid(),
  -- NULL = preset système (lisible par tous, non modifiable par le client).
  owner_id      uuid references auth.users (id) on delete cascade,
  name          text        not null check (char_length(name) between 1 and 80),
  description   text,
  -- Tableau ordonné de 4 délégués :
  --   [{ "slot": "A", "model_id": "meta-llama/llama-3.3-70b-instruct:free",
  --      "label": "Llama 3.3 70B" }, ...]
  delegates     jsonb       not null,
  -- Modèle de synthèse (Chairman) — Stage 3.
  chairman_model text       not null,
  -- true = preset système (owner_id NULL). Doublon explicite pour les requêtes.
  is_preset     boolean     not null default false,
  -- council par défaut de l'utilisateur (ou preset démo par défaut).
  is_default    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Un preset n'a pas de propriétaire ; un council utilisateur en a un.
  constraint councils_owner_preset_chk
    check ((is_preset and owner_id is null) or (not is_preset and owner_id is not null)),
  -- Exactement 4 délégués dans l'assemblée.
  constraint councils_delegates_count_chk
    check (jsonb_typeof(delegates) = 'array' and jsonb_array_length(delegates) = 4)
);

comment on table  public.councils is
  'Composition réutilisable de l''assemblée (4 délégués + Chairman). owner_id NULL = preset système.';
comment on column public.councils.delegates is
  'JSONB ordonné de 4 délégués : { slot, model_id, label }.';
comment on column public.councils.chairman_model is
  'Identifiant OpenRouter du modèle de synthèse (Stage 3).';

create index councils_owner_id_idx on public.councils (owner_id);

create trigger trg_councils_updated_at
  before update on public.councils
  for each row execute function public.set_updated_at();
