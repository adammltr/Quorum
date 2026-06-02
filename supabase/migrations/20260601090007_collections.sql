-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0007 — Collections & items
-- ════════════════════════════════════════════════════════════════════════

-- ─── collections ─────────────────────────────────────────────────────────
-- Regroupement nommé de runs épinglés. Privé par défaut, partageable en
-- lecture seule. FREE : 2 collections. PRO : illimité.
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.collections is
  'Regroupement nommé de runs épinglés. Privé par défaut, partageable en lecture seule.';
comment on column public.collections.is_public is
  'true = lisible en lecture seule par tous (via la page publique).';

create index collections_owner_id_idx on public.collections (owner_id);

create trigger trg_collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- ─── collection_items ────────────────────────────────────────────────────
-- Pivot collection ↔ run. Un run peut figurer dans plusieurs collections.
create table public.collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  run_id        uuid not null references public.runs (id) on delete cascade,
  added_at      timestamptz not null default now(),

  unique (collection_id, run_id)
);

comment on table public.collection_items is
  'Pivot collection ↔ run (épingle). Un run peut appartenir à plusieurs collections.';

create index collection_items_collection_id_idx on public.collection_items (collection_id);
create index collection_items_run_id_idx on public.collection_items (run_id);
