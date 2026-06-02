# Partage / viralité — état

Boucle de partage implémentée (moteur d'acquisition gratuit, jamais derrière le paywall).

- **Page publique** `/q/{slug}` : `src/pages/PublicResult.tsx` (lazy route dans `App.tsx`), charge `get_shared_run` et rejoue la délibération en lecture seule + CTA « Pose ta propre question ».
- **Bouton Partager** : `src/components/council/ShareDialog.tsx` (après le verdict + en-tête page publique). Texte spoiler-friendly, grille emoji, copier-le-lien, X/LinkedIn, Web Share. Logique dans `src/lib/share.ts`. `runId` exposé par `useCouncil`.
- **SQL** : migration `…015_share_rpcs.sql` — `create_share` (idempotent, FREE/anon ok) + `get_share_meta` (lecture sans incrément, SSR/OG).
- **Vercel** (`vercel.json` + `api/`) : `share.ts` injecte OG/title/description + JSON-LD côté serveur ; `og.tsx` génère l'image OG dynamique (@vercel/og, encre+ambre) ; `sitemap.ts` + `public/robots.txt`.
- **Mode mock** : slug `demo` + bundle factice → tout reste démontable sans backend.
- **À faire** : déployer migration 015 + déclarer les env Vercel ; visuel OG à tester en conditions réelles (polices Google Fonts).
