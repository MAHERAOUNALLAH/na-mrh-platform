// ============================================================
// client/scripts/check-site-content-keys.mjs
// Contrôle de couverture du « Contenu du site » : npm run check:content-keys
//
// Vérifie que les sous-points de l'écran (src/pages/secretariat/
// siteContentParts.js) couvrent EXACTEMENT le registre du serveur
// (server/utils/siteContent.js) : aucune clé perdue (non éditable),
// aucune clé en double, aucune clé inconnue du serveur. Vérifie aussi
// que chaque libellé et chaque texte par défaut existe dans les trois
// langues. Code de sortie 1 au premier problème signalé.
// ============================================================

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE_CONTENT_PARTS, partKeys } from '../src/pages/secretariat/siteContentParts.js';

const require = createRequire(import.meta.url);
const registry = require('../../server/utils/siteContent.js');
const LANGS = ['fr', 'en', 'ar'];
const locales = Object.fromEntries(LANGS.map((l) => [
  l, JSON.parse(readFileSync(fileURLToPath(new URL(`../src/locales/${l}.json`, import.meta.url)), 'utf8')),
]));
const get = (obj, path) => path.split('.').reduce((o, p) => (o == null ? o : o[p]), obj);

const problems = [];

// 1. Couverture exacte du registre
const seen = new Map();   // clé → sous-point
for (const part of SITE_CONTENT_PARTS) {
  for (const key of partKeys(part)) {
    if (seen.has(key)) problems.push(`clé en double : ${key} (${seen.get(key)} et ${part.id})`);
    else seen.set(key, part.id);
    if (!registry.SITE_CONTENT_FIELDS[key]) problems.push(`clé inconnue du registre serveur : ${key} (${part.id})`);
  }
}
for (const key of registry.SITE_CONTENT_KEYS) {
  if (!seen.has(key)) problems.push(`clé du registre absente de l'écran (non modifiable) : ${key}`);
}

// 2. Libellés et textes par défaut dans les trois langues
const need = [];   // [clé i18n, doit exister ?]
for (const part of SITE_CONTENT_PARTS) {
  need.push([`adminHome.parts.${part.id}`, true], [`adminHome.intros.${part.id}`, true]);
  for (const id of part.visibility || []) need.push([`adminHome.sections.${id}`, true]);
  for (const g of part.groups) {
    need.push([`adminHome.groups.${g.id}`, true]);
    if (g.help) need.push([`adminHome.groupHelp.${g.id}`, true]);
    for (const key of g.keys) {
      const field = registry.SITE_CONTENT_FIELDS[key];
      if (!field) continue;
      need.push([`adminHome.fields.${key.replace(/\./g, '_')}`, true]);
      // Texte ou liste : la clé est la clé i18n du texte par défaut,
      // sauf emptyDefault (aucun texte par défaut, volontairement).
      if (field.kind === 'text' || field.kind === 'list') need.push([key, !field.emptyDefault]);
    }
  }
}
for (const [key, mustExist] of need) {
  for (const l of LANGS) {
    const v = get(locales[l], key);
    const present = v != null && v !== '' && !(Array.isArray(v) && !v.length);
    if (mustExist && !present) problems.push(`traduction manquante (${l}) : ${key}`);
    if (!mustExist && v !== undefined) problems.push(`texte par défaut interdit (${l}) : ${key} (emptyDefault)`);
  }
}

// Bilan
for (const part of SITE_CONTENT_PARTS) {
  const keys = partKeys(part);
  console.log(`${part.id.padEnd(11)} ${String(keys.length).padStart(3)} champ(s) en ${part.groups.length} groupe(s)${part.visibility ? ` + ${part.visibility.length} case(s) d'affichage` : ''}`);
}
console.log(`total       ${String(seen.size).padStart(3)} clé(s) couvertes, registre : ${registry.SITE_CONTENT_KEYS.length}`);
if (problems.length) {
  for (const p of problems) console.error('PROBLÈME : ' + p);
  process.exit(1);
}
console.log('OK : chaque clé du registre est éditable dans exactement un sous-point.');
