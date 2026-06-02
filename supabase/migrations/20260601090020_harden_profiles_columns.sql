-- ════════════════════════════════════════════════════════════════════════
-- Quorum · 0020 — Durcissement des colonnes de profiles (anti-escalade PRO)
-- ════════════════════════════════════════════════════════════════════════
-- La policy RLS `profiles_update_own` (0011) borne la LIGNE (id = auth.uid())
-- mais PAS les colonnes : un client pouvait donc s'auto-attribuer is_pro,
-- pro_expires_at ou is_anonymous et contourner le quota freemium + la
-- monétisation. Postgres ne permet pas de restreindre les colonnes via
-- WITH CHECK ; on passe donc par des privilèges au niveau COLONNE.
--
-- La RLS reste en place pour le périmètre ligne ; côté client, seules
-- display_name et avatar_url deviennent éditables. Les colonnes sensibles
-- (is_pro, pro_expires_at, trial_started_at, streak_count, is_anonymous…) ne
-- sont écrites que par :
--   • les RPC SECURITY DEFINER (start_reverse_trial, …) — exécutées avec les
--     droits du propriétaire, donc non soumises au grant colonne ;
--   • les triggers (set_updated_at, conversion anonyme→compte) ;
--   • le service_role (Edge Functions), non affecté par ce revoke.
-- ════════════════════════════════════════════════════════════════════════

-- authenticated (inclut les sessions anonymes, dont le rôle JWT est
-- `authenticated`) : ne peut plus écrire que son nom d'affichage et son avatar.
revoke update on public.profiles from authenticated;
grant  update (display_name, avatar_url) on public.profiles to authenticated;

-- anon (requêtes sans session) : aucune policy d'UPDATE ne le concerne, mais on
-- retire le privilège résiduel par principe de moindre privilège.
revoke update on public.profiles from anon;
