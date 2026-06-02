# Sécurité — état

Audit pré-public (2026-06-02) : gitleaks vert sur tout l'historique (0 secret).
Frontière client/serveur OK (anon key seule côté client ; service_role/OpenRouter/BYOK serveur only).
RLS stricte ; BYOK chiffré AES-GCM ; validation entrées + rate limit Edge.

Correctifs appliqués :
- **0020** : `profiles` durci au niveau colonne (revoke UPDATE, grant display_name/avatar_url seulement). Bloque l'auto-attribution de `is_pro`. Appliqué en prod (projet chddwekhghunelzfposz).
- `.gitleaks.toml` : retrait du lookahead `(?!…)` incompatible re2 (le scan + le hook + la CI tournent à nouveau).
- `ratelimit.ts` : `clientIp()` prend le dernier hop XFF (anti-spoofing du rate limit IP).

Reste ouvert : sessions anonymes illimitées (abus borné par rate limit IP + modèles `:free`) — surveiller si abus réel.
