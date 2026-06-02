-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0008 — Question du Jour
-- ════════════════════════════════════════════════════════════════════════

-- ─── daily_question ──────────────────────────────────────────────────────
-- Une question éditoriale par jour (modèle Wordle : la même pour tous).
-- Lecture publique des entrées publiées (voir RLS 0011). Le consensus mondial
-- du jour est agrégé depuis les runs qui la référencent.
create table public.daily_question (
  id                 uuid primary key default gen_random_uuid(),
  -- Jour de publication (clé naturelle, ex. URL quorum.app/q/2026-06-01).
  day                date not null unique,
  question_id        uuid not null references public.questions (id) on delete restrict,
  -- Council officiel utilisé pour la QdJ (assemblée de référence du jour).
  council_id         uuid references public.councils (id) on delete set null,
  -- false = brouillon non visible ; true = publiée (lisible publiquement).
  published          boolean not null default false,
  -- Consensus mondial agrégé du jour (0–100), recalculé périodiquement.
  aggregate_consensus int check (aggregate_consensus between 0 and 100),
  -- Nombre de participations (runs) ayant répondu à la QdJ.
  participant_count  int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table  public.daily_question is
  'Question du Jour (1/jour, même pour tous). Entrées publiées lisibles publiquement.';
comment on column public.daily_question.day is
  'Jour de publication ; clé naturelle de l''URL publique (quorum.app/q/AAAA-MM-JJ).';
comment on column public.daily_question.aggregate_consensus is
  'Consensus mondial agrégé du jour (0–100) calculé depuis les runs liés.';

create index daily_question_question_id_idx on public.daily_question (question_id);

create trigger trg_daily_question_updated_at
  before update on public.daily_question
  for each row execute function public.set_updated_at();

-- FK différée de runs.daily_question_id (la table runs précède daily_question).
alter table public.runs
  add constraint runs_daily_question_id_fkey
  foreign key (daily_question_id)
  references public.daily_question (id) on delete set null;
