-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0023 — Épinglage des runs (sidebar)
-- ════════════════════════════════════════════════════════════════════════
-- Permet à l'utilisateur d'épingler ses délibérations favorites pour un accès
-- rapide depuis la sidebar. RLS inchangée : la politique runs_update_own
-- (migration 0011) autorise déjà le propriétaire à modifier ses propres runs.

alter table public.runs
  add column if not exists is_pinned boolean not null default false;

comment on column public.runs.is_pinned is
  'Run épinglé par l''utilisateur (accès rapide depuis la sidebar). Indépendant des collections.';

-- Index partiel : la sidebar ne liste que les runs épinglés, du plus récent au
-- plus ancien. L'index partiel reste compact (seuls les épinglés y figurent).
create index if not exists runs_user_pinned_idx
  on public.runs (user_id, created_at desc)
  where is_pinned;
