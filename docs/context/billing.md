# Contexte — Monétisation freemium

État : scaffolding open-core posé, **aucun paiement réel câblé**.

- Config centrale : `src/config/billing.ts` (plafonds, prix, flags, surchargeables `VITE_*`). Autorité serveur : table `billing_config` (migration 0019).
- Couche billing abstraite : `src/lib/billing/` (`BillingProvider` + `NoopBillingProvider` → `getBillingProvider()`). Brancher un MoR plus tard, sans toucher l'UI.
- Soft paywall : `src/components/billing/` (`PaywallProvider`/`UpgradeDialog`/`usePaywall`). Jamais avant un verdict vécu (`hasSeenVerdict` dans `CouncilStage`). Déclencheurs : quota, modèle premium, menu compte.
- Surfaçage erreur : `council-client` lit `error.code` → `useCouncil.errorCode` → paywall (`quota_exceeded`/`premium_requires_byok`).
- Reverse-trial : flag `VITE_FEATURE_REVERSE_TRIAL`, RPC idempotente `start_reverse_trial`, tenté dans `AuthProvider`.
- ⚠️ Éditeur mineur → MoR requis (Lemon Squeezy/Polar/Paddle), pas Stripe direct. Détail : `docs/MONETISATION.md`.
- TODO : implémenter un provider MoR ; décider financement inférence premium pendant le trial.
