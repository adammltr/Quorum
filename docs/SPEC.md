# Quorum — Spécification Produit

> Version : 0.1-draft · Auteur : Adam Molitor · Statut : référence vivante

---

## 1. Vision & métaphore de marque

**Quorum** tire son nom du droit parlementaire : le quorum est le nombre minimal de membres requis pour que l'assemblée puisse délibérer et prendre une décision valide. Ici, 4 intelligences artificielles forment ce quorum.

L'utilisateur ne pose pas une question *à une IA*. Il convoque une **assemblée**. Chaque modèle est un délégué avec sa propre voix, ses propres biais, sa propre façon de raisonner. L'assemblée délibère, vote, et rend un verdict collectif — transparent, contradictoire, honnête.

**Ce que Quorum n'est pas** : un chatbot enveloppé dans un thème. C'est un protocole délibératif rendu visible.

**Inspiration intellectuelle** : [karpathy/llm-council](https://github.com/karpathy/llm-council).

---

## 2. Le parcours délibératif en 3 étapes

### Stage 1 — Réponses parallèles

- La question de l'utilisateur est envoyée **simultanément** à 4 modèles LLM via OpenRouter.
- Chaque modèle reçoit un prompt identique, sans contexte des autres.
- Les tokens arrivent en streaming et s'affichent en temps réel (4 colonnes / cartes).
- Chaque carte affiche : nom du modèle, réponse streamée, temps de réponse, statut (streaming / terminé / erreur).
- Si un modèle dépasse `timeout = 30 s` ou retourne une erreur, la carte passe en état `dégradé` (message d'erreur élégant, le flow continue avec les 3 restants).

### Stage 2 — Peer-review aveugle (évaluation croisée)

- Une fois **tous** les modèles terminés (ou timeout), chaque modèle reçoit les réponses des **3 autres** — **anonymisées et mélangées** (les noms sont remplacés par "Modèle A", "Modèle B", "Modèle C").
- Chaque modèle évalue les 3 réponses étrangères et produit un classement structuré.
- **Format attendu en sortie** :
  ```
  FINAL RANKING:
  1. Modèle B — [raison courte]
  2. Modèle A — [raison courte]
  3. Modèle C — [raison courte]
  ```
- **Parsing** : recherche d'abord le bloc `FINAL RANKING:` exact ; **fallback regex** si absent :
  `/(1st?|first|1\.)\s*[:\-]?\s*(model\s*[A-C])/i` et variantes françaises/anglaises.
- Si le parsing échoue : le vote de ce modèle est ignoré (pas d'erreur visible, log interne).
- Les votes sont **agrégés** en un score Borda (1er = 3 pts, 2e = 2 pts, 3e = 1 pt).

### Stage 3 — Synthèse Chairman

- Un 5e appel LLM (le "Chairman") reçoit : la question originale + les 4 réponses + les scores agrégés.
- Le Chairman produit :
  - Un **verdict final** (2-4 paragraphes), synthèse éditoriale des convergences.
  - Un **score de consensus** (0–100) reflétant l'accord entre modèles.
  - Les **désaccords assumés** : points sur lesquels les modèles divergent significativement, listés honnêtement.
- Le verdict s'affiche avec une animation d'entrée distincte (l'accent ambre/or).

---

## 3. Modèle de clés LLM — Hybride BYOK

### Mode démo (sans compte)

- 4 modèles OpenRouter **`:free`** par défaut (ex. `meta-llama/llama-3.3-70b-instruct:free`, `mistralai/mistral-7b-instruct:free`, `google/gemma-2-9b-it:free`, `qwen/qwen3-235b-a22b:free`).
- La clé API OpenRouter est portée **côté serveur** (Supabase Edge Function) — jamais exposée au client.
- **Rate limits** des modèles `:free` : 10 req/min, 50 req/jour par clé. Gestion :
  - Retry avec backoff exponentiel (1 s → 2 s → 4 s, max 3 tentatives).
  - Si rate-limit atteint : affichage élégant "Ce modèle est surchargé, réessaie dans quelques secondes".
  - Dégradation gracieuse : continuer avec les modèles disponibles (minimum 2/4 pour que le flow ait sens).

### Mode BYOK (Bring Your Own Key)

- L'utilisateur saisit sa clé OpenRouter personnelle dans les settings.
- Clé stockée **chiffrée dans Supabase** côté serveur (jamais en localStorage).
- Accès aux modèles premium : `openai/gpt-4.1`, `anthropic/claude-sonnet-4-5`, `google/gemini-2.0-flash-001`, `x-ai/grok-3-mini`, etc.
- Pas de limite de questions en mode BYOK.

### Gestion des erreurs réseau

- Timeout par modèle : 30 s (configurable).
- Si < 2 modèles répondent : annuler la session, afficher une erreur explicite avec bouton "Réessayer".
- Log des erreurs dans Supabase pour monitoring (sans données perso).

---

## 4. First-run & "aha < 60 secondes"

**Principe absolu** : l'utilisateur voit la valeur **avant** de créer un compte.

- **Aucune inscription** requise pour la 1re question.
- L'interface s'ouvre directement sur un champ de question avec une **question pré-remplie inspirante** (rotative, servie statiquement) :
  > *"La conscience peut-elle être simulée, ou est-elle fondamentalement biologique ?"*
  > *"Quelle décision a eu le plus grand impact sur l'histoire de l'humanité ?"*
  > *"Comment la musique crée-t-elle de l'émotion ?"*
- Dès que l'utilisateur soumet, les 4 colonnes s'animent et les tokens arrivent.
- **Jamais d'écran vide** : skeleton animé pendant le chargement, pas de spinner générique.
- **Time-to-first-token visible ≤ 2 s** (objectif).
- La valeur est évidente : voir 4 intelligences différentes construire leur réponse simultanément, puis se juger mutuellement.

---

## 5. Features de rétention

### Historique
- Les sessions sont sauvegardées automatiquement (compte requis pour > 7 jours).
- FREE : historique 7 jours.
- PRO : historique illimité, recherche full-text.

### Collections
- L'utilisateur peut "épingler" une session dans une collection nommée.
- Collections privées par défaut, partageables en lecture seule.

### Councils personnalisables
- Configurer ses propres 4 modèles parmi les disponibles.
- Sauvegarder un "council" avec un nom (ex. "Mon council créativité", "Council factuels").
- PRO : jusqu'à 10 councils sauvegardés.

### Question du jour (QdJ)
- Une question éditoriale choisie chaque jour (type Wordle : même question pour tous).
- L'utilisateur peut répondre, voir le consensus mondial de la journée.
- **Grille de partage** façon Wordle : emoji représentant l'accord/désaccord de chaque modèle.
  ```
  Quorum du 01/06/2026 🟡🟢🟡🟠
  Score de consensus : 72 %
  quorum.app/q/2026-06-01
  ```
- Rendez-vous quotidien = boucle de rétention naturelle.

### Streaks
- Streak de sessions consécutives.
- **Éthique** : jamais culpabilisant. Pas de notification agressive. Pas de streak "brisé" affiché en rouge. Juste un compteur discret et une félicitation légère.

---

## 6. Viralité (K-factor)

### Artefact partageable
- Chaque session terminée génère une **image OG dynamique** (via Supabase Edge Function + Satori/canvas) :
  - 4 blocs de vote (accord/désaccord), score de consensus, question tronquée, branding Quorum.
  - Style : sobre, premium, noir encre + ambre.

### Page publique de résultat
- URL : `quorum.app/r/[session-id]` — rendue côté serveur (SSR) avec meta OG complètes.
- Accessible sans compte.
- Affiche la question, les 4 réponses, les votes, le verdict Chairman.
- Bouton "Pose ta propre question" → conversion naturelle.

### Texte de partage pré-rempli
```
J'ai demandé à 4 IA : "[question]"
Score de consensus : [X]%
Voici ce qu'elles ont délibéré → [URL]
#Quorum
```

### Le partage est gratuit et illimité à vie — même pour les comptes FREE.

---

## 7. Modèle freemium (open-core)

### FREE

| Feature | Limite |
|---|---|
| Questions | 5/jour (IP-based sans compte, 10/jour avec compte) |
| Modèles | `:free` uniquement |
| Historique | 7 jours |
| Collections | 2 |
| Councils | 1 (défaut) |
| Export | Lien public uniquement |
| Partage | Illimité |

### PRO (~8 €/mois ou 72 €/an)

| Feature | Limite |
|---|---|
| Questions | Illimité (BYOK, coûts directs à l'utilisateur) |
| Modèles | Tous les modèles premium disponibles |
| Historique | Illimité + recherche |
| Collections | Illimité |
| Councils | 10 sauvegardés |
| Export | Image HD, Markdown, PDF, lien permanent |
| Partage | Illimité |

### Règle du soft paywall

Le paywall n'apparaît **qu'après le premier moment de valeur** (1re session complète terminée).
Message d'upgrade : contexte, jamais intrusif, toujours fermable.

**Reverse-trial à tester** : 7 jours PRO offerts à l'inscription, downgrade vers FREE à expiration.

---

## 8. Non-objectifs (scope MVP)

- Pas de conseil médical, juridique ou financier engageant (disclaimer légal requis).
- Pas d'application mobile native (iOS/Android) — PWA acceptable si naturel.
- Pas de multi-tenant entreprise (SSO, SAML, namespacing org).
- Pas de fine-tuning ou d'entraînement de modèles.
- Pas de conversation multi-tours au MVP (1 question = 1 session fermée).

---

## 9. Critères d'acceptation mesurables

| Critère | Cible | Mesure |
|---|---|---|
| Aha moment | < 60 s de l'ouverture au premier token visible | Chronométrage manuel + analytics |
| Fluidité | 60 fps constant | Chrome DevTools Performance |
| Qualité | Lighthouse ≥ 95 perf, ≥ 95 a11y | CI automatisé |
| Réactivité | Time-to-first-token visible ≤ 2 s | Waterfall réseau |
| Accessibilité | WCAG 2.2 AA | axe-core + audit manuel |
| Erreur gracieuse | 0 crash visible si 1 modèle fail | Tests d'intégration |
