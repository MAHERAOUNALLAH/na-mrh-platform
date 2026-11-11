// ============================================================
// server/utils/siteContent.js
// Registre du contenu du site modifiable par le Secrétariat.
//
// Règle d'or : le contenu éditable ne vide JAMAIS le site. La base ne
// stocke que des SURCHARGES ; le texte par défaut reste dans les
// fichiers de traduction du client. Pour une clé de texte, la clé est
// exactement la clé i18n qu'elle remplace (« hero.h1 » → t('hero.h1')).
//
// Deux sortes de clés :
//   - kind 'text' : traduit, valeurs valueFr / valueEn / valueAr ;
//     null (ou vide) pour une langue = texte par défaut de cette langue ;
//   - les autres : une seule valeur sans langue, colonne `value`
//       'email' : adresse e-mail (minuscules) ;
//       'phone' : numéro de téléphone ;
//       'int'   : entier de min à max ;
//       'link'  : chemin interne pris dans une liste blanche ;
//       'show'  : affichage d'une section, 'true' / 'false'.
// Une clé absente de ce registre est refusée (404) : impossible
// d'écrire n'importe quoi en base.
// ============================================================

const { normalizeEmail, isValidEmail } = require('./email');

// Pages internes visées par les boutons de l'accueil (les liens du menu).
const INTERNAL_LINKS = [
  '/', '/gouvernance', '/etats-membres', '/groupes-de-travail', '/bibliotheque',
  '/portail-rims', '/actualites', '/contact', '/reclamations',
];

const text = (maxLength, multiline = false) => ({ kind: 'text', maxLength, multiline });

const SITE_CONTENT_FIELDS = {
  // --- Accueil : bandeau principal (hero) ---
  'hero.kicker': text(160),
  'hero.h1': text(160),
  'hero.lead': text(600, true),
  'hero.cta1': text(60),
  'hero.cta1Link': { kind: 'link' },
  'hero.cta2': text(60),
  'hero.cta2Link': { kind: 'link' },
  // --- Accueil : barre de statistiques ---
  'statsLabels.0': text(60),
  'statsLabels.1': text(60),
  'statsLabels.2': text(60),
  'statsLabels.3': text(60),
  'home.stat3Value': { kind: 'int', min: 0, max: 999 },
  'home.stat4Value': { kind: 'int', min: 0, max: 999 },
  // --- Accueil : titres et textes des sections ---
  'homeSections.missionKicker': text(80),
  'homeSections.missionH': text(160),
  'homeSections.missionP': text(1000, true),
  'homeSections.countriesH': text(160),
  'homeSections.twgKicker': text(80),
  'homeSections.twgH': text(160),
  'homeSections.twgP': text(600, true),
  'homeSections.newsKicker': text(80),
  'homeSections.newsH': text(160),
  // --- Accueil : sections affichées ou masquées (le hero, jamais) ---
  'home.show.stats': { kind: 'show' },
  'home.show.mission': { kind: 'show' },
  'home.show.countries': { kind: 'show' },
  'home.show.twgs': { kind: 'show' },
  'home.show.news': { kind: 'show' },
  // --- Coordonnées du Secrétariat (Contact, pied de page, Gouvernance) ---
  'contact.email': { kind: 'email' },
  'contact.phone': { kind: 'phone' },
  'contactPage.secP': text(300, true),
  'footer.contactP': text(160),
  'governance.secretariatD': text(400, true),
};

const SHOW_KEYS = Object.keys(SITE_CONTENT_FIELDS).filter((k) => SITE_CONTENT_FIELDS[k].kind === 'show');
const LANG_COLUMNS = { valueFr: 'FR', valueEn: 'EN', valueAr: 'AR' };

// Caractères de contrôle interdits (le retour à la ligne \n est traité à part).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F]/;
// Texte brut uniquement : on refuse ce qui ressemble à une balise HTML.
// « <b> », « </p> », « <!-- », « <img …> » ; mais pas « a < b et c > d ».
const HTML_TAG = /<\/?[a-z!][^<>]*>/i;
const PHONE = /^\+?[0-9][0-9 ().-]{4,28}[0-9]$/;

function cleanText(raw, field, langLabel) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') return { error: `La valeur ${langLabel} doit être du texte.` };
  const value = raw.replace(/\r\n?/g, '\n').trim();
  if (!value) return { value: null };   // vide = valeur par défaut
  if (CONTROL_CHARS.test(value)) return { error: `La valeur ${langLabel} contient des caractères non autorisés.` };
  if (!field.multiline && value.includes('\n')) return { error: `La valeur ${langLabel} doit tenir sur une seule ligne.` };
  if (HTML_TAG.test(value)) return { error: `La valeur ${langLabel} contient du HTML : seul le texte brut est accepté.` };
  if (value.length > field.maxLength) return { error: `La valeur ${langLabel} dépasse ${field.maxLength} caractères.` };
  return { value };
}

function cleanNeutral(raw, field) {
  if (raw === undefined || raw === null) return { value: null };
  if (field.kind === 'show') {
    if (typeof raw !== 'boolean') return { error: 'La valeur doit valoir true ou false.' };
    return { value: raw ? 'true' : 'false' };
  }
  if (field.kind === 'int') {
    if (!Number.isInteger(raw) || raw < field.min || raw > field.max) {
      return { error: `La valeur doit être un nombre entier de ${field.min} à ${field.max}.` };
    }
    return { value: String(raw) };
  }
  if (typeof raw !== 'string') return { error: 'La valeur doit être du texte.' };
  const value = raw.trim();
  if (!value) return { value: null };
  if (field.kind === 'email') {
    const email = normalizeEmail(value);
    if (email.length > 254 || !isValidEmail(email)) return { error: 'Adresse e-mail invalide.' };
    return { value: email };
  }
  if (field.kind === 'phone') {
    if (!PHONE.test(value)) return { error: 'Numéro de téléphone invalide (chiffres, espaces, +, -, ., parenthèses).' };
    return { value: value.replace(/\s+/g, ' ') };
  }
  if (field.kind === 'link') {
    if (!INTERNAL_LINKS.includes(value)) return { error: 'Lien refusé : seules les pages internes du site sont autorisées.' };
    return { value };
  }
  return { error: 'Type de champ inconnu.' };
}

// Valide le corps d'un PUT /api/admin/site-content/:key.
//   texte : { valueFr?, valueEn?, valueAr? } — null ou '' = valeur par défaut
//   autre : { value }                        — null = valeur par défaut
// Toute autre propriété est refusée. Renvoie { error } ou { data }.
function validateSiteContentBody(key, body) {
  const field = SITE_CONTENT_FIELDS[key];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Corps de requête JSON attendu.' };
  }
  const allowed = field.kind === 'text' ? Object.keys(LANG_COLUMNS) : ['value'];
  const unknown = Object.keys(body).filter((p) => !allowed.includes(p));
  if (unknown.length) {
    return { error: `Propriété non autorisée pour ce champ : ${unknown.join(', ')} (attendu : ${allowed.join(', ')}).` };
  }
  const data = {};
  if (field.kind === 'text') {
    for (const [column, label] of Object.entries(LANG_COLUMNS)) {
      const r = cleanText(body[column], field, label);
      if (r.error) return { error: r.error };
      data[column] = r.value;
    }
  } else {
    if (!('value' in body)) return { error: 'La propriété value est obligatoire.' };
    const r = cleanNeutral(body.value, field);
    if (r.error) return { error: r.error };
    data.value = r.value;
  }
  return { data };
}

// Une ligne qui ne surcharge plus rien (toutes valeurs NULL) est supprimée.
function isEmptyOverride(data) {
  return ['valueFr', 'valueEn', 'valueAr', 'value'].every((c) => data[c] === null || data[c] === undefined);
}

// Registre « public » de la description des champs pour l'écran admin.
function describeFields() {
  return Object.entries(SITE_CONTENT_FIELDS).map(([key, f]) => ({ key, ...f, ...(f.kind === 'link' ? { options: INTERNAL_LINKS } : {}) }));
}

module.exports = {
  SITE_CONTENT_FIELDS, SITE_CONTENT_KEYS: Object.keys(SITE_CONTENT_FIELDS), SHOW_KEYS,
  validateSiteContentBody, isEmptyOverride, describeFields,
};
