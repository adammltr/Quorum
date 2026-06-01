# Quorum — Instructions Claude Code

## Mission
Quorum est une web-app open source qui soumet une question à 4 LLMs en parallèle, les fait s'évaluer mutuellement en aveugle, puis synthétise un verdict de consensus via un modèle "Chairman".
L'objectif est la qualité d'exécution niveau Apple/Anthropic : chaque pixel, chaque interaction, chaque milliseconde compte.

## Stack imposée

| Couche | Technologie |
|---|---|
| Build | Vite + plugin `@tailwindcss/vite` |
| UI | React 19 (RSC désactivé au MVP) + TypeScript strict |
| Styles | Tailwind v4 + shadcn/ui (style `new-york`) |
| Animation | Motion (anciennement Framer Motion) |
| Backend | Supabase — Postgres + Auth + Edge Functions (Deno) |
| LLM | OpenRouter (modèles `:free` par défaut, BYOK pour premium) |

## Règles TypeScript / React

- `strict: true` dans tsconfig. Zéro `any`. Zéro `@ts-ignore` sans commentaire explicatif.
- Composants fonctionnels uniquement. Hooks pour toute logique réutilisable.
- Types explicites sur toutes les props, retours de hooks, et réponses API.
- Imports absolus via alias `@/` (résolu vers `src/`).

## Règles d'accessibilité & performance

- WCAG 2.2 AA minimum : labels aria, contrastes, navigation clavier, focus visible.
- Toujours respecter `prefers-reduced-motion` : wrapper les animations Motion dans la condition adéquate.
- Mobile-first : breakpoints Tailwind `sm → md → lg`. Tester à 375px.
- 60 fps constant. Pas d'animations CSS `opacity/transform` bloquantes sur le thread principal.
- `Lighthouse ≥ 95` perf + a11y en cible.

## Règles de design

Voir **docs/DESIGN.md** pour le système complet. Résumé impératif :

- **INTERDICTION** : polices `Inter`, `Roboto`, `Arial`, `system-ui` génériques.
- **INTERDICTION** : dégradé violet-sur-blanc générique, cartes plates sans intention.
- Chaque écran a une intention visuelle explicite et une hiérarchie claire.
- Polices projet : `Instrument Serif` (display), `Geist Sans` (UI), `Geist Mono` (technique).
- Couleurs en OKLCH, tokens définis dans `docs/DESIGN.md`. Mode sombre par défaut.
- Accent signature = ambre/or, réservé au verdict et aux moments de valeur.
- Glassmorphism via la recette CSS sûre de `docs/DESIGN.md` (pas de SVG filter en prod).

## Workflow de développement

1. **Avant toute feature** : lire `docs/SPEC.md` et `docs/DESIGN.md`.
2. **Pour toute tâche non triviale** : proposer un plan (fichiers touchés, approche, edge cases) et attendre validation avant de coder.
3. **Fin de tâche** : lancer `typecheck + lint + build`, corriger les erreurs, montrer un diff résumé.
4. **Jamais de commit sans validation explicite** de ma part.
5. **Branches** : `feat/`, `fix/`, `chore/` — PR vers `main`.
6. Messages de commit en français, format conventionnel : `feat: [ce qui est ajouté]`.

## Sécurité

- **JAMAIS** commiter `.env`, `.env.local`, ou toute clé API, token, mot de passe.
- Toute valeur secrète passe par variables d'environnement (voir `.env.example`).
- Les variables `VITE_*` sont exposées au client — n'y mettre que des valeurs publiques.
- Les secrets serveur (service_role Supabase, clés privées) restent dans les Edge Functions uniquement.
- Vérifier `.gitignore` avant tout `git add`.

## Langue

Réponds-moi **toujours en français**, quel que soit le contexte.
