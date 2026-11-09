// ============================================================
// client/src/utils/api.js
//
// SEUL endroit du client qui connaît l'adresse de l'API. Toutes les
// pages passent par ces helpers, publiques comme protégées : aucun
// fetch('http://...') en dur ailleurs.
//
// Les routes protégées exigent l'en-tête Authorization : on passe
// le token en 2e argument. Pour une route publique, on passe null.
//
// Usage :
//   const data = await apiGet('/api/twgs');                      // public
//   const data = await apiGet('/api/admin/countries', token);    // protégé
//   await apiPost('/api/admin/countries', token, { ...pays });
//   await apiPost('/api/contact', null, form);                   // public
//
// En cas d'échec, la promesse est rejetée avec une Error dont
// `err.status` vaut le code HTTP (404, 401…). Une page peut donc
// traiter un 404 comme un message plutôt que comme une panne
// (voir TwgDetail.jsx). Une panne réseau donne `err.status` undefined.
// ============================================================

// Adresse de l'API, lue au moment du BUILD par Vite (les variables
// VITE_* sont inscrites en dur dans le bundle : jamais de secret ici).
// - En production (Vercel) : VITE_API_URL=https://api.exemple.org
// - En local, sans variable : le serveur Express de développement.
// Voir client/.env.example.
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

// Fonction interne commune aux cinq verbes
async function request(method, path, token, body) {
  const options = { method, headers: {} };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  // Content-Type seulement quand on envoie un corps : un GET public
  // sans en-tête particulier reste une requête "simple" pour le
  // navigateur, sans requête OPTIONS préalable (preflight CORS).
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  // Une réponse d'erreur peut ne pas être du JSON (ex. page HTML
  // "Cannot GET" si la route n'existe pas). On gère ce cas pour
  // éviter le fameux "Unexpected token '<'".
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.error) || `Erreur ${response.status} — la route existe-t-elle et le serveur est-il à jour ?`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export const apiGet = (path, token) => request('GET', path, token);
export const apiPost = (path, token, body) => request('POST', path, token, body);
export const apiPut = (path, token, body) => request('PUT', path, token, body);
export const apiPatch = (path, token, body) => request('PATCH', path, token, body);
export const apiDelete = (path, token) => request('DELETE', path, token);
