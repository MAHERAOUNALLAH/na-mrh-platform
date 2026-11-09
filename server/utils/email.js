// ============================================================
// server/utils/email.js
// Règle unique pour les adresses e-mail des comptes, partagée par
// l'API (index.js) et scripts/create-admin.js.
//
// ⚠️ RÈGLE : un e-mail de compte est TOUJOURS enregistré et recherché
// en minuscules, sans espaces autour. La colonne users.email est unique
// et la recherche de connexion (findUnique) est sensible à la casse :
// « Admin.Reel@… » enregistré tel quel ne pourrait plus se connecter en
// tapant « admin.reel@… ». On normalise donc à l'écriture (création,
// modification) ET à la lecture (connexion).
// ============================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

// Renvoie l'adresse normalisée, ou '' si la valeur n'est pas du texte.
function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(normalized) {
  return normalized.length > 0 && normalized.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(normalized);
}

module.exports = { normalizeEmail, isValidEmail };
