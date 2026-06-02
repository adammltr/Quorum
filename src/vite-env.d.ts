/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_FEATURE_QUESTION_DU_JOUR: string
  readonly VITE_FEATURE_BYOK: string
  /** "true" → force le flux mock du council (démo sans backend déployé). */
  readonly VITE_COUNCIL_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
