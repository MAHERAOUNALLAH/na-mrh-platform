// ============================================================
// client/src/context/AuthContext.jsx
//
// Un Context React = une "boîte" de données accessible depuis
// N'IMPORTE QUEL composant, sans avoir à la faire passer de
// composant en composant (contrairement à un simple useState
// qui ne vit que dans SON composant). Idéal pour "qui est
// connecté ?", une info dont Layout, Login, ProtectedRoute et
// bien d'autres ont besoin en même temps.
//
// Deux sortes d'échec, à ne JAMAIS confondre :
//   - un REFUS (401/403) : le serveur a répondu « non ». Le jeton est
//     mort ou les droits ont changé → on déconnecte / on relit le profil.
//   - une PANNE (réseau coupé, serveur qui redémarre, 5xx) : le serveur
//     n'a rien dit sur la session. On GARDE le jeton et on affiche une
//     erreur avec « Réessayer ». Sinon, un simple redémarrage de l'API
//     déconnecterait tout le monde.
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, setAuthErrorHandler } from '../utils/api';

const AuthContext = createContext(null);

const SESSION_ENDED_MESSAGE =
  'Votre session a pris fin (compte désactivé, supprimé ou session expirée). Veuillez vous reconnecter.';
const SESSION_CHECK_FAILED_MESSAGE =
  'Impossible de vérifier votre session : le serveur ne répond pas. Vos identifiants sont conservés.';

const isRefusal = (err) => err.status === 401 || err.status === 403;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  // Le temps de vérifier la session au chargement. S'il n'y a pas de
  // jeton, il n'y a rien à vérifier : loading part directement à false
  // (plutôt que d'appeler setLoading(false) dans l'effet).
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  // Panne pendant la vérification de session (pas un refus)
  const [sessionError, setSessionError] = useState(null);
  // Message à afficher sur la page de connexion après une fin de session
  const [sessionNotice, setSessionNotice] = useState(null);
  // Incrémenté par « Réessayer » pour relancer la vérification
  const [retryCount, setRetryCount] = useState(0);

  const clearSession = useCallback((notice) => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSessionError(null);
    setLoading(false);
    setSessionNotice(notice || null);
  }, []);

  // Au tout premier chargement de l'app (ou après un F5) : si un
  // token existe déjà dans le navigateur, on vérifie qu'il est
  // toujours valide en interrogeant /api/auth/me — sinon la
  // personne devrait se reconnecter à chaque rafraîchissement,
  // ce qui serait très pénible.
  useEffect(() => {
    if (!token) return;
    apiGet('/api/auth/me', token)
      .then((data) => {
        setUser(data.user);
        setSessionError(null);
      })
      .catch((err) => {
        if (isRefusal(err)) {
          clearSession(SESSION_ENDED_MESSAGE);
        } else {
          // Panne : on ne touche pas au jeton.
          console.error('Vérification de session impossible :', err);
          setSessionError(SESSION_CHECK_FAILED_MESSAGE);
        }
      })
      .finally(() => setLoading(false));
  }, [token, retryCount, clearSession]);

  // Branché une seule fois : tout appel protégé (n'importe quelle page)
  // qui reçoit 401/403 arrive ici, via utils/api.js.
  useEffect(() => {
    setAuthErrorHandler((status, failedToken) => {
      // Une réponse tardive d'un ancien jeton ne doit pas déconnecter
      // une session ouverte entre-temps.
      if (failedToken !== localStorage.getItem('token')) return;
      if (status === 401) {
        // Session révoquée côté serveur → déconnexion. ProtectedRoute
        // redirige alors vers /connexion, où ce message s'affiche.
        clearSession(SESSION_ENDED_MESSAGE);
      } else {
        // 403 : la session vit encore mais les droits ont changé
        // (ex. rétrogradé en reader). On relit le profil : ProtectedRoute
        // affichera « Accès refusé » avec le niveau à jour.
        apiGet('/api/auth/me', failedToken)
          .then((data) => setUser(data.user))
          .catch(() => {});   // un 401 ici repasse par ce même gestionnaire
      }
    });
    return () => setAuthErrorHandler(null);
  }, [clearSession]);

  function login(newToken, newUser) {
    localStorage.setItem('token', newToken);   // survit à un rechargement de page
    setToken(newToken);
    setUser(newUser);
    setSessionError(null);
    setSessionNotice(null);
  }

  function logout() {
    clearSession(null);
  }

  // « Réessayer » après une panne : appelé depuis un clic, pas depuis
  // un effet, donc setLoading(true) est permis ici.
  function retrySession() {
    setLoading(true);
    setSessionError(null);
    setRetryCount((n) => n + 1);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, sessionError, sessionNotice, login, logout, retrySession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Un petit raccourci : plutôt que useContext(AuthContext) partout,
// on écrit juste useAuth(). Convention très courante en React.
export function useAuth() {
  return useContext(AuthContext);
}
