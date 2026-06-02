-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0003 — Questions
-- ════════════════════════════════════════════════════════════════════════

-- ─── questions ───────────────────────────────────────────────────────────
-- Énoncé soumis à l'assemblée. Table séparée des runs car une même question
-- peut être exécutée plusieurs fois (notamment la Question du Jour, posée par
-- de nombreux utilisateurs). author_id est NULL pour les questions éditoriales.
create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  -- NULL = question éditoriale (QdJ, exemples first-run servis statiquement).
  author_id     uuid references auth.users (id) on delete set null,
  body          text        not null check (char_length(body) between 1 and 2000),
  -- Empreinte de normalisation (lower/trim) pour dédup et regroupement QdJ.
  normalized_hash text,
  -- true = question proposée par l'équipe (QdJ, suggestions first-run).
  is_editorial  boolean     not null default false,
  created_at    timestamptz not null default now()
);

comment on table  public.questions is
  'Énoncés réutilisables. Une question → N runs. author_id NULL pour l''éditorial (QdJ).';
comment on column public.questions.normalized_hash is
  'Hash de l''énoncé normalisé (dédup / agrégation de la Question du Jour).';
comment on column public.questions.is_editorial is
  'true = question éditoriale (Question du Jour, exemples inspirants du first-run).';

create index questions_author_id_idx on public.questions (author_id);
create index questions_normalized_hash_idx on public.questions (normalized_hash);
