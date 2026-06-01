# Contexte — Scaffold

État au 2026-06-01. Socle technique + design system posés, aucun code métier.

- Stack : Vite 8 + React 19.2 + TS 6 (strict) + Tailwind v4 (`@tailwindcss/vite`) + shadcn (new-york) + Motion 12 + Supabase JS + react-router 7. Gestionnaire : pnpm.
- Tokens OKLCH (clair/sombre) dans `src/styles/tokens.css`, mapping `@theme inline` dans `src/index.css`. Ambre signature = `--color-gold`/`bg-gold` (renommé pour éviter collision avec `--accent` neutre de shadcn).
- Thème : défaut sombre, toggle accessible, anti-FOUC inline dans `index.html`. Classe `.dark`/`.light` sur `<html>`.
- Primitives : `GlassCard`, `StaggerContainer`, `FadeIn`, `SpringReveal` (toutes reduced-motion). Variantes dans `src/lib/motion.ts`.
- Vitrine : `/_designsystem` (palette, typo, composants, verre+motion). Accueil minimal sur `/`.
- Polices self-host woff2 dans `public/fonts/`. Instrument Serif en statique (n'existe pas en variable).
- Vérifs OK : typecheck (strict, 0 err), lint (0 warn), build (644ms). Dev : http://localhost:5173.
- Quirk : racine git = `C:/`. pnpm config dans `pnpm-workspace.yaml`.
