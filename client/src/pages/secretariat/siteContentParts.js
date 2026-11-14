// ============================================================
// client/src/pages/secretariat/siteContentParts.js
// Sous-points de l'onglet « Contenu du site » de l'Espace Secrétariat :
// une page (une route) par sujet, chacune avec ses groupes de champs
// repliables. Lu par le menu (SecretariatLayout.jsx), les routes
// (App.jsx), l'écran (SiteContentAdmin.jsx) et le contrôle de
// couverture (client/scripts/check-site-content-keys.mjs).
//
// Chaque clé du registre serveur (server/utils/siteContent.js) doit
// figurer ici UNE fois, et une seule : dans `keys` d'un groupe, ou dans
// `visibility` (cases « sections affichées », clés home.show.<id>).
// Vérification : `npm run check:content-keys` (dossier client).
//
//   id    : libellés adminHome.parts.<id> et adminHome.intros.<id>
//   slug  : adresse /secretariat/contenu-du-site/<slug>
//   view  : page publique ouverte par « Voir la page sur le site »
//   groups: id → titre adminHome.groups.<id> ; help → adminHome.groupHelp.<id>
// ============================================================

export const SITE_CONTENT_BASE = '/secretariat/contenu-du-site';

export const SITE_CONTENT_PARTS = [
  {
    id: 'home',
    slug: 'accueil',
    view: '/',
    visibility: ['stats', 'mission', 'countries', 'twgs', 'news'],
    groups: [
      { id: 'hero', keys: ['hero.kicker', 'hero.h1', 'hero.lead', 'hero.cta1', 'hero.cta1Link', 'hero.cta2', 'hero.cta2Link'] },
      { id: 'stats', keys: ['statsLabels.0', 'statsLabels.1', 'statsLabels.2', 'home.stat3Value', 'statsLabels.3', 'home.stat4Value'] },
      { id: 'mission', keys: ['homeSections.missionKicker', 'homeSections.missionH', 'homeSections.missionP', 'homeSections.countriesH'] },
      { id: 'twgs', keys: ['homeSections.twgKicker', 'homeSections.twgH', 'homeSections.twgP'] },
      { id: 'news', keys: ['homeSections.newsKicker', 'homeSections.newsH'] },
    ],
  },
  {
    id: 'governance',
    slug: 'gouvernance',
    view: '/gouvernance',
    groups: [
      { id: 'govHead', keys: ['governance.kicker', 'governance.h', 'governance.p'] },
      { id: 'govLevels', keys: ['governance.steeringT', 'governance.steeringD', 'governance.secretariatT', 'governance.secretariatD', 'governance.twgLevelT', 'governance.twgLevelD'] },
      { id: 'govPartners', keys: ['governance.partnersT', 'governance.partnersList'] },
    ],
  },
  {
    id: 'footer',
    slug: 'pied-de-page',
    view: '/',
    groups: [
      { id: 'footerCols', help: true, keys: ['footer.aboutT', 'footer.aboutP', 'footer.linksT', 'footer.contactT', 'footer.contactP'] },
      { id: 'footerBottom', keys: ['footer.partnersT', 'footer.partnersList', 'footer.copyright'] },
    ],
  },
  {
    id: 'contact',
    slug: 'coordonnees',
    view: '/contact',
    groups: [
      { id: 'contactCoords', keys: ['contact.email', 'contact.phone'] },
      { id: 'contactPage', keys: ['contactPage.secP'] },
    ],
  },
  {
    id: 'privacy',
    slug: 'confidentialite',
    view: '/confidentialite',
    groups: [
      { id: 'privacyPage', keys: ['privacy.title', 'privacy.body'] },
    ],
  },
];

// Adresse d'un sous-point.
export const partPath = (part) => `${SITE_CONTENT_BASE}/${part.slug}`;

// Toutes les clés du registre couvertes par un sous-point.
export const partKeys = (part) => [
  ...(part.visibility || []).map((id) => `home.show.${id}`),
  ...part.groups.flatMap((g) => g.keys),
];
