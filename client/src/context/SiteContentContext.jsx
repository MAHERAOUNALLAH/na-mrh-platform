// ============================================================
// client/src/context/SiteContentContext.jsx
// Contenu du site modifiable par le Secrétariat (accueil, Gouvernance,
// pied de page, coordonnées).
//
// RÈGLE : le contenu éditable ne vide JAMAIS le site. L'API ne renvoie
// que des SURCHARGES ; tout ce qui n'est pas surchargé — ou tout, si
// l'appel échoue — vient des valeurs par défaut :
//   - textes : la clé est la clé i18n elle-même → t(clé) ;
//   - valeurs sans langue : SITE_CONTENT_DEFAULTS (utils/siteContentDefaults.js).
// Un échec de /api/site-content ne bloque donc rien : `ready` passe à
// true et les pages affichent les textes par défaut.
//
// Usage dans une page :
//   const { text, list, value, show } = useSiteContent();
//   <h1>{text('hero.h1')}</h1>   <bdi dir="ltr">{value('contact.email')}</bdi>
//   <InlineList items={list('footer.partnersList')} />   (tableau de chaînes)
// Rendu toujours comme du TEXTE par React (jamais de HTML).
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../utils/api';
import { SITE_CONTENT_DEFAULTS } from '../utils/siteContentDefaults';

const SiteContentContext = createContext(null);

const LANG_COLUMN = { fr: 'valueFr', en: 'valueEn', ar: 'valueAr' };

export function SiteContentProvider({ children }) {
  const { t, i18n } = useTranslation();
  const [overrides, setOverrides] = useState({});
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);   // incrémenté par reload()

  useEffect(() => {
    apiGet('/api/site-content')
      .then((rows) => {
        const map = {};
        for (const row of Array.isArray(rows) ? rows : []) map[row.key] = row;
        setOverrides(map);
      })
      .catch((err) => {
        // Panne : on garde les surcharges déjà connues (ou aucune) → textes par défaut.
        console.error('Contenu du site indisponible, textes par défaut affichés :', err);
      })
      .finally(() => setReady(true));
  }, [version]);

  // Appelé par l'écran admin après un enregistrement (depuis un clic).
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const text = useCallback((key) => {
    const row = overrides[key];
    const custom = row && row[LANG_COLUMN[i18n.language]];
    return custom || t(key);
  }, [overrides, i18n.language, t]);

  // Liste traduite (type « list » du registre) : surcharge de la langue
  // affichée, un élément par ligne ; sinon le tableau des locales.
  const list = useCallback((key) => {
    const row = overrides[key];
    const custom = row && row[LANG_COLUMN[i18n.language]];
    if (custom) return custom.split('\n').map((item) => item.trim()).filter(Boolean);
    const fallback = t(key, { returnObjects: true });
    return Array.isArray(fallback) ? fallback : [];
  }, [overrides, i18n.language, t]);

  const value = useCallback((key) => {
    const row = overrides[key];
    return (row && row.value) || SITE_CONTENT_DEFAULTS[key];
  }, [overrides]);

  const show = useCallback((key) => value(`home.show.${key}`) !== 'false', [value]);

  return (
    <SiteContentContext.Provider value={{ ready, text, list, value, show, reload, overrides }}>
      {children}
    </SiteContentContext.Provider>
  );
}

// Même exception ESLint que useAuth (voir AuthContext.jsx) : la règle ne
// concerne que le rechargement à chaud de Vite en développement.
// eslint-disable-next-line react-refresh/only-export-components
export function useSiteContent() {
  return useContext(SiteContentContext);
}
