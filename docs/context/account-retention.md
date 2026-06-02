# Couche compte & rétention — état

Frontend complet au-dessus du schéma/RLS/RPC existants (migrations 0001-0015).

- **Auth** : `AuthProvider` (anon→compte préservant `auth.uid()`), magic link (`updateUser`/`signInWithOtp`) + Google (`linkIdentity`/`signInWithOAuth`). `AuthDialog`, `AccountMenu`.
- **Historique** : `/history`, recherche locale, cartes `HistoryCard` (score, extrait verdict, expiration FREE 7 j, épingler/partager/supprimer).
- **Collections** : `/collections` + `/collections/:id`, CRUD, public/privé, épinglage via `AddToCollectionDialog`.
- **Councils** : `/councils`, presets à caractère (« Les Sceptiques », « Le Comité Créatif », « Le Tribunal »), compositeur `CouncilComposer` (4 délégués + Chairman), convocation via `/?council=<id>`.
- **Freemium serveur** : migration `0016` (flip is_anonymous, plafonds collections 2 / councils 1-10, presets).

À faire côté Supabase : activer Anonymous auth, provider Google, **Manual Linking**. Régénérer `database.types.ts` après `0016` (RPC inchangées, donc non bloquant).
