# Monétisation — Quorum (open-core)

> Statut : **scaffolding**. Aucun paiement réel n'est câblé. Les CTA PRO
> présentent la valeur ; aucun débit n'est possible tant que
> `VITE_BILLING_PROVIDER=none`.

## Modèle

| | FREE | PRO (~8 €/mois · 72 €/an) |
|---|---|---|
| Questions/jour | 5 (anon) / 10 (compte) — configurable | Illimité (BYOK) |
| Modèles | `:free` uniquement | Premium (GPT-5.1, Claude, Gemini 3…) |
| Historique | 7 jours | Illimité + recherche |
| Collections | 2 | Illimité |
| Councils | 1 | 10 |
| Export | Lien public | Image HD, Markdown, PDF, lien permanent |
| Partage | Illimité | Illimité |

Tous les plafonds sont **réglables** :
- **Autorité serveur** : table `billing_config` (migration 0019) +
  triggers/RPC. Modifier une valeur en base ajuste l'offre sans redéploiement.
- **Miroir client** : `src/config/billing.ts` (surchargeable par `VITE_*`),
  pour un retour UI immédiat. En cas de divergence, **le serveur tranche**.

## Soft paywall (SPEC §7)

Règle absolue : **le mur n'apparaît JAMAIS avant un premier verdict complet**.
- `PaywallProvider` (`src/components/billing/`) expose `openPaywall(reason)` et
  rend un unique `UpgradeDialog` contextuel, toujours fermable.
- Déclencheurs : quota atteint **après** un verdict vécu (`hasSeenVerdict`),
  sélection d'un modèle premium, entrée « Passer en PRO » du menu compte.
- L'accroche part de la valeur vécue (« Tu as adoré ce verdict ? »), jamais
  d'un blocage sec. Le partage et les modèles gratuits restent illimités.

## Couche billing (abstraite, sans fournisseur)

`src/lib/billing/` — l'app ne dépend QUE de l'interface `BillingProvider`
(`createCheckout`, `getPortalUrl`, `getSubscription`). Au MVP,
`getBillingProvider()` renvoie un `NoopBillingProvider` (jamais de paiement).
Brancher un vrai fournisseur = écrire une implémentation + le retourner selon
`BILLING_FLAGS.provider`. Aucun composant à modifier.

## ⚠️ Choix du fournisseur — MERCHANT OF RECORD requis

**L'éditeur est mineur.** Conséquences directes :

- **Stripe en direct est déconseillé.** Stripe te rend *vendeur légal* : tu
  collectes et reverses la TVA / sales-tax dans chaque juridiction, tu émets les
  factures, tu gères les litiges. Un compte Stripe Standard suppose en outre une
  capacité contractuelle (majorité) et, souvent, une entité (auto-entreprise…).
- **Préférer un Merchant of Record (MoR)** : il devient le vendeur officiel,
  gère TVA/conformité fiscale mondiale, facturation, remboursements et fraude.
  Candidats acceptant des créateurs individuels :
  - **Lemon Squeezy** — simple, orienté SaaS/indie, MoR complet.
  - **Polar** — open-source-friendly, MoR, bon pour un projet OSS.
  - **Paddle** — robuste, MoR historique, plutôt pour volumes plus élevés.
- **Avant la prod** : vérifier les CGU du MoR sur l'âge minimum (souvent un
  représentant légal/parent est nécessaire pour un compte de paiement), et
  passer le compte bancaire de réception au nom d'un représentant légal si
  requis.

**À décider avant d'activer un paiement** : MoR retenu, entité/représentant
légal, seuils de TVA. Tant que ce n'est pas tranché : `VITE_BILLING_PROVIDER=none`.

## Reverse-trial (sous flag)

`VITE_FEATURE_REVERSE_TRIAL=true` → X jours de PRO offerts à un nouveau compte,
**une seule fois** (RPC `start_reverse_trial`, idempotente). Tenté côté client
dans `AuthProvider` à la conversion, granti côté serveur.

> Caveat coût : le trial pose `is_pro=true` (questions illimitées, historique,
> collections/councils, sélection premium dans l'UI). L'**inférence** sur modèle
> premium reste toutefois conditionnée à une clé **BYOK** dans l'Edge Function
> `council` (garde-fou : ne pas brûler les crédits de l'opérateur). Financer
> l'inférence premium pendant le trial est une décision opérationnelle distincte.
