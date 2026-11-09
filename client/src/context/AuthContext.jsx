// ============================================================
// client/src/context/AuthContext.jsx
//
// Un Context React = une "boîte" de données accessible depuis
// N'IMPORTE QUEL composant, sans avoir à la faire passer de
// composant en composant (contrairement à un simple useState
// qui ne vit que dans SON composant). Idéal pour "qui est
// connecté ?", une info dont Layout, Login, ProtectedRoute et
// bien d'autres ont besoin en même temps.
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);   // le temps de vérifier la session au chargement

  // Au tout premier chargement de l'app (ou après un F5) : si un
  // token existe déjà dans le navigateur, on vérifie qu'il est
  // toujours valide en interrogeant /api/auth/me — sinon la
  // personne devrait se reconnecter à chaque rafraîchissement,
  // ce qui serait très pénible.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('http://localhost:4000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Session invalide');
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        // Le token est périmé ou invalide : on nettoie tout
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function login(newToken, newUser) {
    localStorage.setItem('token', newToken);   // survit à un rechargement de page
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Un petit raccourci : plutôt que useContext(AuthContext) partout,
// on écrit juste useAuth(). Convention très courante en React.
export function useAuth() {
  return useContext(AuthContext);
}