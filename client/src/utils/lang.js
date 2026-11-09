// ============================================================
// client/src/utils/lang.js
// Helper partagé pour le contenu multilingue venant de l'API.
//
// En base, un enregistrement ne porte pas un objet imbriqué
// { name: { fr, en, ar } } comme le faisait la maquette, mais trois
// colonnes séparées : nameFr, nameEn, nameAr. Cette fonction choisit
// la bonne colonne selon la langue active.
//
//   pickLang(twg, 'name', 'fr')  →  twg.nameFr
//   pickLang(twg, 'desc', 'ar')  →  twg.descAr
//
// Toute page affichant du contenu multilingue de l'API importe cette
// fonction — on ne la redéfinit jamais localement.
// ============================================================

export function pickLang(obj, field, lang) {
  const cap = lang.charAt(0).toUpperCase() + lang.slice(1);
  return obj[`${field}${cap}`];
}
