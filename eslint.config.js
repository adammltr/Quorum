import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `supabase/functions` = code Deno ; `api` = fonctions Vercel (Node/edge,
  // typecheckées par Vercel au déploiement). Hors périmètre eslint du front.
  globalIgnores(['dist', 'supabase/functions', 'api']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Composants shadcn/ui vendorisés : ils exportent aussi leurs variantes
    // (cva). On désactive la règle react-refresh pour ces fichiers générés.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
