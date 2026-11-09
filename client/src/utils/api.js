// ============================================================
// client/src/utils/api.js
//
// Toutes les routes protégées exigent l'en-tête Authorization.
// Plutôt que de le réécrire dans chaque composant (et risquer
// de l'oublier une fois sur deux), on centralise ici.
//
// Usage :
//   const data = await apiGet('/api/admin/countries', token);
//   await apiPost('/api/admin/countries', token, { ...pays });
// ============================================================

const BASE_URL = 'http://localhost:4000';

// Fonction interne commune aux quatre verbes
async function request(method, path, token, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) options.headers.Authorization = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

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
    throw new Error(
      (data && data.error) || `Erreur ${response.status} — la route existe-t-elle et le serveur est-il à jour ?`,
    );
  }
  return data;
}

export const apiGet = (path, token) => request('GET', path, token);
export const apiPost = (path, token, body) => request('POST', path, token, body);
export const apiPut = (path, token, body) => request('PUT', path, token, body);
export const apiPatch = (path, token, body) => request('PATCH', path, token, body);
export const apiDelete = (path, token) => request('DELETE', path, token);