-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0001 — Extensions & fonctions utilitaires
-- ════════════════════════════════════════════════════════════════════════
-- Pose les fondations partagées par toutes les migrations suivantes :
--   • extensions Postgres requises (UUID, crypto, cron de purge)
--   • trigger générique `set_updated_at` pour les colonnes updated_at
--   • générateur de slug public court et non devinable
--   • trigger `handle_new_user` : crée le profil à chaque nouvel auth user
-- ════════════════════════════════════════════════════════════════════════

-- pgcrypto fournit gen_random_uuid() et gen_random_bytes() (slugs).
create extension if not exists pgcrypto with schema extensions;
-- pg_cron sert à purger l'historique gratuit expiré (voir 0005_runs).
create extension if not exists pg_cron with schema extensions;

-- ─── updated_at automatique ──────────────────────────────────────────────
-- Met à jour la colonne updated_at à chaque UPDATE. Branché par table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE : rafraîchit updated_at = now().';

-- ─── Génération de slug public ───────────────────────────────────────────
-- Slug base32-ish de 10 caractères, non devinable, sûr pour une URL publique
-- (ex. quorum.app/r/<slug>). On évite les caractères ambigus (0/o, 1/l).
create or replace function public.generate_public_slug(p_length int default 10)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  result   text := '';
  i        int;
begin
  for i in 1..p_length loop
    result := result || substr(
      alphabet,
      1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)),
      1
    );
  end loop;
  return result;
end;
$$;

comment on function public.generate_public_slug(int) is
  'Retourne un slug aléatoire non devinable pour les artefacts publics (shares).';

-- ─── handle_new_user ─────────────────────────────────────────────────────
-- Déclenché après l'insertion d'un auth.users (anonyme OU inscrit).
-- Crée la ligne profiles correspondante et reporte le flag is_anonymous.
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire pour écrire
-- dans public.profiles malgré la RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, is_anonymous, display_name)
  values (
    new.id,
    coalesce(new.is_anonymous, false),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crée public.profiles à la création d''un auth user (anonyme ou inscrit).';

-- Le trigger lui-même est créé dans 0002 (après l'existence de profiles).
