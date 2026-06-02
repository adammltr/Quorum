# Contexte — Rituel quotidien (Question du Jour)

État : implémenté, non commité. typecheck + lint + build verts. S'appuie sur la table `daily_question` (0008) déjà présente.

- **SQL** `…017_daily_ritual.sql` : table `daily_streak` (éthique, RLS own) ; RPC `record_daily_participation` (relie le run à la QdJ, recalcule consensus mondial + participants, met à jour le streak, renvoie la comparaison sociale — idempotent/jour) ; `list_daily_questions` (archive publique SEO) ; `get_daily_question` recréée (expose `id`) ; seed QdJ du 2026-06-02.
- **Client** `src/lib/daily.ts` : lecture QdJ/archive, participation, texte Wordle (`buildDailyShareText`), rappel opt-in ÉTHIQUE (.ics, jamais de push), mémoire locale « déjà fait », mocks démo.
- **UI** : `/jour` + `/jour/:day` (`pages/DailyQuestion.tsx`, réutilise `useCouncil` + composants stages), `/jour/archive` (`pages/DailyArchive.tsx`). Composants `daily/` : `StreakBadge` (sans culpabilisation), `DailyShareCard` (grille emoji), `DailyResultPanel` (barres comparatives + streak + partage + rappel). Nav AppShell + lien hero accueil.
- **SEO/SSR** : `api/daily.ts` (OG/JSON-LD par jour + archive), rewrites `vercel.json`, QdJ ajoutées au `sitemap.ts`.
- **À faire** : pousser migration 0017 + régénérer `database.types.ts` (types ajoutés à la main en attendant) ; cron/back-office de publication des QdJ futures ; tester l'agrégat en conditions réelles.
