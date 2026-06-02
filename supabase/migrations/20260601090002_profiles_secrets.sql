-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0002 — Profiles & secrets utilisateur
-- ════════════════════════════════════════════════════════════════════════

-- ─── profiles ────────────────────────────────────────────────────────────
-- Extension 1-1 de auth.users. Une ligne par identité, anonyme ou inscrite.
-- La conversion anonyme→compte conserve le même id (auth) : aucune migration
-- de données nécessaire, on bascule simplement is_anonymous à false.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  avatar_url      text,
  -- true tant que l'identité n'a pas d'email/identité liée (mode démo gratuit).
  is_anonymous    boolean     not null default true,
  -- Freemium : flag PRO et expiration (reverse-trial 7 j possible).
  is_pro          boolean     not null default false,
  pro_expires_at  timestamptz,
  -- Rétention douce : streak de sessions consécutives (jamais culpabilisant).
  streak_count    int         not null default 0,
  last_active_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table  public.profiles is
  'Profil 1-1 avec auth.users (anonyme ou inscrit). is_anonymous distingue le mode démo.';
comment on column public.profiles.is_anonymous is
  'true = identité anonyme (signInAnonymously). Passe à false à la conversion en compte.';
comment on column public.profiles.is_pro is
  'Accès PRO : BYOK illimité, historique illimité, collections/councils étendus.';
comment on column public.profiles.pro_expires_at is
  'Fin du PRO (reverse-trial ou abonnement). NULL = pas de PRO actif.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger de création de profil (fonction définie en 0001).
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── user_secrets ────────────────────────────────────────────────────────
-- Clé OpenRouter BYOK, chiffrée côté serveur. Table volontairement isolée et
-- SANS aucune policy RLS pour le client : seul le service_role (Edge Functions)
-- peut lire/écrire la valeur chiffrée. Le client ne voit jamais la clé.
create table public.user_secrets (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  -- Chiffré par l'Edge Function (ex. AES-GCM) — jamais en clair, jamais côté client.
  openrouter_key_encrypted text,
  has_byok                 boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.user_secrets is
  'Clés BYOK chiffrées. RLS sans policy client : accès service_role (Edge Functions) uniquement.';
comment on column public.user_secrets.openrouter_key_encrypted is
  'Clé OpenRouter chiffrée côté serveur. Jamais exposée au client ni en localStorage.';

create trigger trg_user_secrets_updated_at
  before update on public.user_secrets
  for each row execute function public.set_updated_at();
