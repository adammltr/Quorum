-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0011 — Row Level Security (politiques strictes)
-- ════════════════════════════════════════════════════════════════════════
-- Principe : RLS activé partout. Par défaut, chaque utilisateur ne lit/écrit
-- QUE ses données (auth.uid()). Exceptions de lecture publique explicites :
--   • shares actifs    (page publique via slug)
--   • daily_question publiées
--   • presets de councils, questions éditoriales
-- Le bundle public détaillé d'un run partagé passe par des RPC SECURITY
-- DEFINER (0012) — les tables de base restent owner-only.
-- Note : avec l'Anonymous Auth, les visiteurs anonymes ont le rôle
-- `authenticated` (claim is_anonymous=true) ; `auth.uid()` est non nul.
-- Le rôle `anon` couvre l'accès public sans session (SSR/partage).
-- ════════════════════════════════════════════════════════════════════════

-- ─── profiles ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- INSERT géré par le trigger handle_new_user (SECURITY DEFINER) ; DELETE par cascade auth.

-- ─── user_secrets ────────────────────────────────────────────────────────
-- RLS activé, AUCUNE policy : le client (anon/authenticated) ne peut rien.
-- Seul le service_role (Edge Functions) accède aux clés chiffrées.
alter table public.user_secrets enable row level security;

-- ─── questions ───────────────────────────────────────────────────────────
alter table public.questions enable row level security;

create policy "questions_select_own_or_editorial" on public.questions
  for select to anon, authenticated
  using (is_editorial or author_id = auth.uid());

create policy "questions_insert_own" on public.questions
  for insert to authenticated
  with check (author_id = auth.uid() and is_editorial = false);

create policy "questions_update_own" on public.questions
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "questions_delete_own" on public.questions
  for delete to authenticated using (author_id = auth.uid());

-- ─── councils ────────────────────────────────────────────────────────────
alter table public.councils enable row level security;

create policy "councils_select_own_or_preset" on public.councils
  for select to anon, authenticated
  using (is_preset or owner_id = auth.uid());

create policy "councils_insert_own" on public.councils
  for insert to authenticated
  with check (owner_id = auth.uid() and is_preset = false);

create policy "councils_update_own" on public.councils
  for update to authenticated
  using (owner_id = auth.uid() and is_preset = false)
  with check (owner_id = auth.uid() and is_preset = false);

create policy "councils_delete_own" on public.councils
  for delete to authenticated
  using (owner_id = auth.uid() and is_preset = false);

-- ─── runs ────────────────────────────────────────────────────────────────
alter table public.runs enable row level security;

create policy "runs_select_own" on public.runs
  for select to authenticated using (user_id = auth.uid());

create policy "runs_insert_own" on public.runs
  for insert to authenticated with check (user_id = auth.uid());

create policy "runs_update_own" on public.runs
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "runs_delete_own" on public.runs
  for delete to authenticated using (user_id = auth.uid());

-- ─── model_responses / reviews / verdicts ────────────────────────────────
-- Accès gouverné par la propriété du run parent. (Les écritures réelles se
-- font côté serveur via service_role pendant la délibération.)
alter table public.model_responses enable row level security;
alter table public.reviews         enable row level security;
alter table public.verdicts        enable row level security;

create policy "model_responses_rw_via_run" on public.model_responses
  for all to authenticated
  using (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()));

create policy "reviews_rw_via_run" on public.reviews
  for all to authenticated
  using (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()));

create policy "verdicts_rw_via_run" on public.verdicts
  for all to authenticated
  using (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()));

-- ─── collections ─────────────────────────────────────────────────────────
alter table public.collections enable row level security;

create policy "collections_select_own_or_public" on public.collections
  for select to anon, authenticated
  using (is_public or owner_id = auth.uid());

create policy "collections_insert_own" on public.collections
  for insert to authenticated with check (owner_id = auth.uid());

create policy "collections_update_own" on public.collections
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "collections_delete_own" on public.collections
  for delete to authenticated using (owner_id = auth.uid());

-- ─── collection_items ────────────────────────────────────────────────────
-- Gouverné par la propriété (ou publicité) de la collection parente.
alter table public.collection_items enable row level security;

create policy "collection_items_select" on public.collection_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.collections c
    where c.id = collection_id and (c.is_public or c.owner_id = auth.uid())
  ));

create policy "collection_items_write_own" on public.collection_items
  for all to authenticated
  using (exists (
    select 1 from public.collections c
    where c.id = collection_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.collections c
    where c.id = collection_id and c.owner_id = auth.uid()
  ));

-- ─── daily_question ──────────────────────────────────────────────────────
-- Lecture publique des entrées publiées. Écriture : service_role uniquement.
alter table public.daily_question enable row level security;

create policy "daily_question_select_published" on public.daily_question
  for select to anon, authenticated using (published = true);

-- ─── shares ──────────────────────────────────────────────────────────────
-- Lecture publique des partages actifs (page publique via slug). Le
-- propriétaire gère les siens (y compris désactivés).
alter table public.shares enable row level security;

create policy "shares_select_public_or_own" on public.shares
  for select to anon, authenticated
  using (is_active or owner_id = auth.uid());

create policy "shares_insert_own" on public.shares
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid())
  );

create policy "shares_update_own" on public.shares
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "shares_delete_own" on public.shares
  for delete to authenticated using (owner_id = auth.uid());

-- ─── daily_usage ─────────────────────────────────────────────────────────
-- Lecture de son propre compteur (affichage du quota). Écriture via RPC
-- increment_question_usage (SECURITY DEFINER).
alter table public.daily_usage enable row level security;

create policy "daily_usage_select_own" on public.daily_usage
  for select to authenticated using (user_id = auth.uid());
