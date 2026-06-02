-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0009 — Shares (artefacts publics)
-- ════════════════════════════════════════════════════════════════════════

-- ─── shares ──────────────────────────────────────────────────────────────
-- Artefact public d'un run : page partageable + image OG. Identifié par un
-- slug non devinable (quorum.app/r/<slug>). Lisible par TOUS quand actif
-- (RLS publique en 0011). Le partage est gratuit et illimité, même en FREE.
create table public.shares (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.runs (id) on delete cascade,
  -- Propriétaire (pour gérer/désactiver le partage). NULL si l'auteur disparaît.
  owner_id     uuid references auth.users (id) on delete set null,
  -- Slug public court et non devinable (généré en 0001).
  slug         text not null unique default public.generate_public_slug(),
  -- URL de l'image OG dynamique (Edge Function + Satori/canvas).
  og_image_url text,
  view_count   int not null default 0,
  -- false = partage révoqué (la page publique cesse d'être lisible).
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table  public.shares is
  'Artefact public d''un run (slug + image OG). Lisible par tous tant que is_active.';
comment on column public.shares.slug is
  'Slug public non devinable de l''URL quorum.app/r/<slug>.';
comment on column public.shares.is_active is
  'false = partage révoqué (page publique non lisible).';

create index shares_run_id_idx on public.shares (run_id);
create index shares_owner_id_idx on public.shares (owner_id);
