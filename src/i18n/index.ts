/**
 * Configuration i18next de Quorum.
 *
 * Anglais par défaut (fallback), français auto-détecté. Ordre de détection :
 *   localStorage('quorum-lang') → navigator.language → fallback 'en'.
 * `load: 'languageOnly'` réduit 'fr-FR' / 'fr-CA' → 'fr'. Seules 'en' et 'fr'
 * sont supportées : toute autre langue retombe sur 'en'.
 *
 * Importé une seule fois dans main.tsx AVANT le render.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en'
import fr from './fr'

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

/** Clé localStorage de la langue choisie (réutilisée par le toggle). */
export const LANGUAGE_STORAGE_KEY = 'quorum-lang'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: 'en',
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      // React échappe déjà le XSS au rendu.
      escapeValue: false,
    },
    returnNull: false,
  })

/** Change la langue active et la persiste (localStorage géré par le detector). */
export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang)
}

export default i18n
