-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0014 — Rate limiting par IP (protection de la clé OpenRouter free)
-- ════════════════════════════════════════════════════════════════════════
-- Complète le quota par session (`increment_question_usage`, 0010) : empêche
-- un attaquant de multiplier les sessions anonymes derrière une même IP pour
-- épuiser la clé `:free`. Fenêtre FIXE, compteur atomique.
--
-- Confidentialité : on ne stocke JAMAIS l'IP en clair — uniquement un hash
-- (SHA-256 + sel, calculé côté Edge Function). Appelée par le service_role.
-- ════════════════════════════════════════════════════════════════════════

create table public.rate_limit (
  -- Hash de l'IP (SHA-256 + sel serveur). Jamais l'IP brute.
  ip_hash      text        not null,
  -- Début de la fenêtre courante (tronqué côté RPC).
  window_start timestamptz not null,
  count        int         not null default 0,

  primary key (ip_hash, window_start)
);

comment on table public.rate_limit is
  'Compteur de requêtes par (hash IP, fenêtre) pour limiter l''abus de la clé free. IP hachée.';

-- RLS : aucune policy → table inaccessible aux clients (anon/authenticated).
-- Seul le service_role (Edge Functions) y accède, en bypass RLS.
alter table public.rate_limit enable row level security;

create index rate_limit_window_idx on public.rate_limit (window_start);

-- ─── consume_ip_rate_limit ───────────────────────────────────────────────
-- Incrémente atomiquement le compteur de la fenêtre courante pour un hash IP et
-- indique si la requête est autorisée. Fenêtre fixe de `p_window_seconds`.
-- Retourne { allowed, remaining, limit, reset_at }.
create or replace function public.consume_ip_rate_limit(
  p_ip_hash        text,
  p_limit          int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        int;
begin
  -- Borne basse de la fenêtre fixe courante (alignée sur l'epoch).
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit (ip_hash, window_start, count)
  values (p_ip_hash, v_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set count = public.rate_limit.count + 1
  returning count into v_count;

  return jsonb_build_object(
    'allowed',   v_count <= p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'limit',     p_limit,
    'reset_at',  v_window_start + make_interval(secs => p_window_seconds)
  );
end;
$$;

comment on function public.consume_ip_rate_limit(text, int, int) is
  'Incrémente le compteur (hash IP, fenêtre fixe) et renvoie {allowed, remaining, limit, reset_at}.';

-- Réservé au service_role (jamais exposé aux rôles publics).
revoke all on function public.consume_ip_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_ip_rate_limit(text, int, int) to service_role;

-- Purge quotidienne des fenêtres anciennes (pg_cron, 03:10 UTC). Idempotent.
do $$
begin
  perform cron.unschedule('quorum_purge_rate_limit')
  where exists (select 1 from cron.job where jobname = 'quorum_purge_rate_limit');
exception when others then
  null;
end;
$$;

do $$
begin
  perform cron.schedule(
    'quorum_purge_rate_limit',
    '10 3 * * *',
    $cron$delete from public.rate_limit where window_start < now() - interval '1 day';$cron$
  );
exception when others then
  null;
end;
$$;
