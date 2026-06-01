# Politique de sécurité — Quorum

## Versions supportées

| Version | Support sécurité |
|---|---|
| `main` (branche) | ✅ Oui |
| Autres branches | ❌ Non |

## Reporter une faille

**Ne pas ouvrir d'issue publique GitHub pour signaler une faille de sécurité.**

### Comment signaler

Envoie un email à **adammolitor2008@gmail.com** avec :

- **Sujet** : `[SECURITY] Quorum — [description courte]`
- **Description** de la vulnérabilité (type, composant affecté)
- **Étapes pour reproduire** (POC si possible)
- **Impact potentiel** (données exposées, utilisateurs affectés, etc.)
- **Tes coordonnées** si tu veux être mentionné dans le fix (optionnel)

### Ce qui se passe ensuite

1. **Accusé de réception sous 48h** (souvent plus rapide).
2. **Évaluation** : on confirme la vulnérabilité et évalue la sévérité.
3. **Fix** : développement d'un patch, généralement en privé.
4. **Divulgation coordonnée** : on te tient informé avant la publication publique du fix.
5. **Credit** : ton nom dans le CHANGELOG du fix (si tu le souhaites).

### Délai de divulgation

On s'engage à déployer un fix dans un délai raisonnable selon la sévérité :

| Sévérité | Délai cible |
|---|---|
| Critique (CVSS ≥ 9) | 7 jours |
| Haute (CVSS 7-8.9) | 14 jours |
| Moyenne (CVSS 4-6.9) | 30 jours |
| Faible (CVSS < 4) | 90 jours |

## Scope (ce qui est en périmètre)

- L'application web Quorum (frontend React + Supabase Edge Functions)
- La gestion des clés API utilisateurs (BYOK)
- L'authentification et les sessions
- Les données utilisateurs stockées dans Supabase
- Les images Docker ou scripts de déploiement si publiés

## Hors scope

- Les services tiers (OpenRouter, Supabase, Vercel) — signaler directement à eux
- Les attaques nécessitant un accès physique à la machine
- Le social engineering
- Les rapports purement théoriques sans POC ni impact démontrable

## Merci

La sécurité d'une app open source repose sur la communauté. Merci de prendre le temps de signaler de façon responsable.
