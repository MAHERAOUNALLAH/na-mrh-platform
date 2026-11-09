// ============================================================
// client/src/i18n.js
// Configuration de react-i18next : charge les 3 fichiers de
// traduction et les rend disponibles partout via useTranslation().
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: 'fr',            // langue de départ
    fallbackLng: 'fr',    // si une clé manque dans une langue, on retombe sur le français
    interpolation: {
      escapeValue: false, // React échappe déjà le HTML tout seul
    },
  });

export default i18n;