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

// Langue et sens d'écriture posés sur le document à chaque changement :
//   <html lang dir>  -> lecteurs d'écran, césure, sens de lecture (RTL) ;
//   <body data-lang> -> polices arabes (index.css : body[data-lang="ar"]).
function applyDocumentLanguage(lng) {
  const dir = i18n.getResource(lng, 'translation', 'dir') || 'ltr';
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
  document.body.dataset.lang = lng;
}
i18n.on('languageChanged', applyDocumentLanguage);
applyDocumentLanguage(i18n.language);

export default i18n;